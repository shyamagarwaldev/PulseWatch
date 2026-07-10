package worker

import (
	"context"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	sh "github.com/shyamagarwaldev/PulseWatch/monitor/internals/shared"
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
		sh.JobStreamKey,
		sh.Workers,
		"$",
	).Err()

	if err != nil && !strings.Contains(err.Error(), "BUSYGROUP") {
		return fmt.Errorf("create consumer group: %w", err)
	}
	return nil
}

func (w *BaseWorker) CacheUpdateAndStreamAck(ctx context.Context, nextTick time.Time, msg *redis.XMessage, el string) error {
	exists, err := w.rds.HExists(ctx, sh.HashKey, el).Result()
	if err != nil {
		return fmt.Errorf("HExists: %w", err)
	}
	tx := w.rds.TxPipeline()
	if exists {
		tx.ZAdd(ctx, sh.SchedulerQueueKey, redis.Z{
			Score:  float64(nextTick.UnixMilli()),
			Member: el,
		})
	}
	tx.XAck(ctx, sh.JobStreamKey, sh.Workers, msg.ID)
	tx.XDel(ctx, sh.JobStreamKey, msg.ID)

	if _, err := tx.Exec(ctx); err != nil {
		return fmt.Errorf("redis transaction: %w", err)
	}
	return nil
}

func (w *BaseWorker) DbUpdateAndInsert(ctx context.Context, msg *redis.XMessage, nextTick time.Time, monitorJob *sh.JobEvent, latency int64, status string) error {
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
		monitorJob.WebsiteID,
		monitorJob.UserID,
		latency,
		status,
	)
	if err != nil {
		return fmt.Errorf("DbUpdateAndInsert: insert website tick: %w", err)
	}
	tag, err := tx.Exec(ctx,
		`UPDATE "UserWebsite"
		SET
			next_tick = $1,
			last_tick = $2
		WHERE
			user_id = $3
		AND
			website_id = $4;
		`,
		nextTick,
		time.Now(),
		monitorJob.UserID,
		monitorJob.WebsiteID,
	)
	if err != nil {
		return fmt.Errorf("DbUpdateAndInsert: update user website: %w", err)
	}
	// Defensive check.
	// Normally UserWebsite is soft deleted, so this path
	// should only occur if data has already been cleaned up.
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("DbUpdateAndInsert: user not found: %v", w.AckAndDelete(ctx, msg))
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("DbUpdateAndInsert: commit transaction: %w", err)
	}
	return nil
}

func (w *BaseWorker) AckAndDelete(ctx context.Context, msg *redis.XMessage) error {
	tx := w.rds.TxPipeline()
	tx.XAck(ctx, sh.JobStreamKey, sh.Workers, msg.ID)
	tx.XDel(ctx, sh.JobStreamKey, msg.ID)
	if _, err := tx.Exec(ctx); err != nil {
		return fmt.Errorf("redis transaction: %w", err)
	}
	return nil
}
