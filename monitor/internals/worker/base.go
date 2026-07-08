package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	job "github.com/shyamagarwaldev/PulseWatch/monitor/internals/shared"
	key "github.com/shyamagarwaldev/PulseWatch/monitor/internals/shared"
)

type BaseWorker struct {
	db  *pgxpool.Pool
	rds *redis.Client
}

func (base *BaseWorker) Init(ctx context.Context) error {
	// conn, err := pgx.Connect(ctx, os.Getenv("DATABASE_URL"))
	config, err := pgxpool.ParseConfig(os.Getenv("DATABASE_URL"))
	if err != nil {
		return err
	}

	config.MaxConns = 20
	config.MinConns = 5
	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return fmt.Errorf("connect postgres: %w", err)
	}
	err = pool.Ping(ctx)
	if err != nil {
		return fmt.Errorf("ping db: %w", err)
	}
	fmt.Println("Successfully connected to postgres server!")
	base.db = pool
	base.rds = redis.NewClient(&redis.Options{
		Addr: os.Getenv("REDIS_ADDR"),
		DB:   0,
	})
	s, err := base.rds.Ping(ctx).Result()
	if err != nil {
		return fmt.Errorf("ping scheduler redis: %w", err)
	}
	fmt.Println("Successfully connected to Redis server!", s)
	err = base.rds.XGroupCreateMkStream(
		ctx,
		key.JobStreamKey,
		key.Workers,
		"$",
	).Err()

	if err != nil && !strings.Contains(err.Error(), "BUSYGROUP") {
		return fmt.Errorf("create consumer group: %w", err)
	}
	return nil
}

func (w *BaseWorker) CacheUpdateAndStreamAck(ctx context.Context, job *job.JobEvent, msg *redis.XMessage) error {
	b, err := json.Marshal(job)
	if err != nil {
		return fmt.Errorf(
			"marshal job (user=%s website=%s): %w",
			job.UserID,
			job.WebsiteID,
			err,
		)
	}
	tx := w.rds.TxPipeline()
	tx.ZAdd(ctx,
		key.SchedulerQueueKey,
		redis.Z{
			Score:  float64(job.NextTick.UnixMilli()),
			Member: b,
		},
	)
	tx.XAck(ctx,
		key.JobStreamKey,
		key.Workers,
		msg.ID,
	)
	tx.XDel(ctx, key.JobStreamKey, msg.ID)
	if _, err := tx.Exec(ctx); err != nil {
		return fmt.Errorf("redis transaction: %w,", err)
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
