package scheduler

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/redis/go-redis/v9"
	job "github.com/shyamagarwaldev/PulseWatch/monitor/internals/shared"
	key "github.com/shyamagarwaldev/PulseWatch/monitor/internals/shared"
)

type Scheduler struct {
	// *priority_queue --> redis sorted set
	db  *pgx.Conn
	rds *redis.Client
}

func (sche *Scheduler) Init(ctx context.Context) error {
	conn, err := pgx.Connect(ctx, os.Getenv("DATABASE_URL"))
	if err != nil {
		return fmt.Errorf("connect postgres: %w", err)
	}
	err = conn.Ping(ctx)
	if err != nil {
		return fmt.Errorf("ping db: %w", err)
	}
	fmt.Println("Successfully connected to postgres server!")
	sche.db = conn
	sche.rds = redis.NewClient(&redis.Options{
		Addr: os.Getenv("REDIS_ADDR"),
	})
	s, err := sche.rds.Ping(ctx).Result()
	if err != nil {
		return fmt.Errorf("ping scheduler redis: %w", err)
	}
	fmt.Println("Successfully connected to Redis server!", s)
	err = sche.rds.Del(ctx, key.SchedulerQueueKey).Err()
	if err != nil {
		return fmt.Errorf("clear scheduler queue: %w", err)
	}
	return nil
}

func (sche *Scheduler) Run() {
	ctx := context.Background()

	if err := sche.Init(ctx); err != nil {
		log.Fatal(err)
	}

	defer sche.db.Close(ctx)
	defer sche.rds.Close()

	if err := sche.LoadJobs(ctx); err != nil {
		log.Fatal(err)
	}

	sche.SchedulerLoop(ctx)
}

func (sche *Scheduler) LoadJobs(ctx context.Context) error {
	rows, err := sche.db.Query(ctx, `
        SELECT
			uw.user_id,
			uw.website_id,
			w.url,
			uw.interval_seconds,
			uw.next_tick
		FROM "UserWebsite" uw
		JOIN "Website" w
		ON uw.website_id = w.id;
    `)
	if err != nil {
		return fmt.Errorf("query scheduler jobs: %w", err)
	}
	jobs, err := pgx.CollectRows(rows, pgx.RowToStructByName[job.JobEvent])

	if err != nil {
		return fmt.Errorf("collect scheduler jobs: %w", err)
	}

	for _, job := range jobs {
		b, err := json.Marshal(job)
		if err != nil {
			return fmt.Errorf(
				"marshal job (user=%s website=%s): %w",
				job.UserID,
				job.WebsiteID,
				err,
			)
		}
		err = sche.rds.ZAdd(ctx,
			key.SchedulerQueueKey,
			redis.Z{
				Score:  float64(job.NextTick.UnixMilli()), // -> see this later
				Member: string(b),
			},
		).Err()
		if err != nil {
			return fmt.Errorf(
				"enqueue job into scheduler queue (user=%s website=%s): %w",
				job.UserID,
				job.WebsiteID,
				err,
			)
		}
	}
	return nil
}

func (sche *Scheduler) SchedulerLoop(ctx context.Context) {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			// TODO: perform scheduled work
			now := time.Now().UnixMilli()
			members, err := sche.rds.ZRangeArgs(ctx, redis.ZRangeArgs{
				Key:     key.SchedulerQueueKey,
				Start:   "-inf",
				Stop:    fmt.Sprintf("%d", now),
				ByScore: true,
			}).Result()
			if err != nil {
				log.Printf("scheduler: fetch due jobs: %v", err)
				continue
			}
			for _, m := range members {
				select {
				case <-ctx.Done():
					return
				default:
					var jobMonitor job.JobEvent
					err := json.Unmarshal([]byte(m), &jobMonitor)
					if err != nil {
						log.Printf("scheduler: unmarshal job payload: %v", err)
						continue
					}
					tx := sche.rds.TxPipeline()
					tx.XAdd(ctx, &redis.XAddArgs{
						Stream: key.JobStreamKey,
						Values: map[string]string{
							"payload": m,
						},
					})
					tx.ZRem(ctx,
						key.SchedulerQueueKey,
						m,
					)
					if _, err = tx.Exec(ctx); err != nil {
						log.Printf("scheduler: Tx err: %v,", err)
						continue
					}

				}
			}
		case <-ctx.Done():
			return
		}
	}
}
