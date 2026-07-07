package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/redis/go-redis/v9"
	job "github.com/shyamagarwaldev/PulseWatch/monitor/internals/types"
)

const (
	SchedulerQueueKey = "scheduler:queue"
	JobStreamKey      = "jobs:stream"
	Workers           = "Workers"
	// UniqueViolationCode = "23505"
)

type BaseWorker struct {
	db            *pgx.Conn
	scheduleRedis *redis.Client
	streamRedis   *redis.Client
}

func (base *BaseWorker) Init(ctx context.Context) error {
	conn, err := pgx.Connect(ctx, os.Getenv("DATABASE_URL"))
	if err != nil {
		return fmt.Errorf("connect postgres: %w", err)
	}
	base.db = conn
	base.scheduleRedis = redis.NewClient(&redis.Options{
		Addr: os.Getenv("REDIS_PQ_ADDR"),
		DB:   0,
	})
	s, err := base.scheduleRedis.Ping(ctx).Result()
	if err != nil {
		return fmt.Errorf("ping scheduler redis: %w", err)
	}
	fmt.Println("Successfully connected to scheduler Redis server!", s)
	base.streamRedis = redis.NewClient(&redis.Options{
		Addr: os.Getenv("REDIS_STREAM_ADDR"),
		DB:   1,
	})
	s, err = base.streamRedis.Ping(ctx).Result()
	if err != nil {
		return fmt.Errorf("ping stream redis: %w", err)
	}
	fmt.Println("Successfully connected to Redis stream server!", s)
	err = base.streamRedis.XGroupCreateMkStream(
		ctx,
		JobStreamKey,
		Workers,
		"$",
	).Err()

	if err != nil && !strings.Contains(err.Error(), "BUSYGROUP") {
		return fmt.Errorf("create consumer group: %w", err)
	}
	return nil
}

func (w *BaseWorker) RSAck(ctx context.Context, msg *redis.XMessage) error {
	err := w.streamRedis.XAck(ctx,
		JobStreamKey,
		Workers,
		msg.ID,
	).Err()
	if err != nil {
		return fmt.Errorf("ack message: %v", err)
	}
	return nil
}

func (w *BaseWorker) ReEnqueue(ctx context.Context, job *job.JobEvent) error {
	b, err := json.Marshal(job)
	if err != nil {
		return fmt.Errorf(
			"marshal job (user=%s website=%s): %w",
			job.UserID,
			job.WebsiteID,
			err,
		)
	}
	err = w.scheduleRedis.ZAdd(ctx,
		SchedulerQueueKey,
		redis.Z{
			Score:  float64(job.NextTick.UnixMilli()),
			Member: b,
		},
	).Err()
	if err != nil {
		return fmt.Errorf("requeue job: %w", err)
	}
	return nil
}

func (w *BaseWorker) DbUpdateAndInsert(ctx context.Context, msg *redis.XMessage, job *job.JobEvent, latency int64, status string) error {
	tx, err := w.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("DbUpdateAndInsert: begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)
	_, err = tx.Exec(ctx,
		`INSERT INTO "WebsiteTick"
				(	id,
					website_id,
					user_id,
					latency_ms,
					status
				)
				VALUES
				($1,$2,$3,$4,$5)
				`,
		msg.ID,
		job.WebsiteID,
		job.UserID,
		latency,
		status,
	)
	if err != nil {
		// var pgErr *pgconn.PgError
		// if errors.As(err, &pgErr) && pgErr.Code == UniqueViolationCode {
		// 	fmt.Printf("DbUpdateAndInsert: Duplicate Key Conflict handled: %v", err)
		// 	return errors.New("duplicate processing")
		// }
		return fmt.Errorf("DbUpdateAndInsert: insert website tick: %w", err)
	}
	if _, err = tx.Exec(ctx,
		`UPDATE "UserWebsite"
		SET
			next_tick = $1,
			last_tick = $2
		WHERE
			user_id = $3
		AND
			website_id = $4;
		`,
		job.NextTick,
		time.Now(),
		job.UserID,
		job.WebsiteID,
	); err != nil {
		return fmt.Errorf("DbUpdateAndInsert: update user website: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("DbUpdateAndInsert: commit transaction: %w", err)
	}
	return nil
}
