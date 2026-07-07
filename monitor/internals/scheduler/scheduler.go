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
	job "github.com/shyamagarwaldev/PulseWatch/monitor/internals/types"
)

const (
	SchedulerQueueKey = "scheduler:queue"
	JobStreamKey      = "jobs:stream"
)

type Scheduler struct {
	// *priority_queue --> redis sorted set
	db               *pgx.Conn
	scheduleRedis    *redis.Client
	streamRedis      *redis.Client
	scheduleQueueKey string
	jobStreamKey     string
}

func (sche *Scheduler) Init(ctx context.Context) error {
	conn, err := pgx.Connect(ctx, os.Getenv("DATABASE_URL"))
	if err != nil {
		return fmt.Errorf("connect postgres: %w", err)
	}
	sche.db = conn
	sche.scheduleRedis = redis.NewClient(&redis.Options{
		Addr: os.Getenv("REDIS_PQ_ADDR"),
		DB:   0,
	})
	s, err := sche.scheduleRedis.Ping(ctx).Result()
	if err != nil {
		return fmt.Errorf("ping scheduler redis: %w", err)
	}
	fmt.Println("Successfully connected to scheduler Redis server!", s)
	sche.scheduleQueueKey = SchedulerQueueKey

	err = sche.scheduleRedis.Del(ctx, sche.scheduleQueueKey).Err()
	if err != nil {
		return fmt.Errorf("clear scheduler queue: %w", err)
	}
	sche.streamRedis = redis.NewClient(&redis.Options{
		Addr: os.Getenv("REDIS_STREAM_ADDR"),
		DB:   1,
	})
	s, err = sche.streamRedis.Ping(ctx).Result()
	if err != nil {
		return fmt.Errorf("ping stream redis: %w", err)
	}
	fmt.Println("Successfully connected to Redis stream server!", s)
	sche.jobStreamKey = JobStreamKey
	return nil
}

func (sche *Scheduler) Run() {
	ctx := context.Background()

	if err := sche.Init(ctx); err != nil {
		log.Fatal(err)
	}

	defer sche.db.Close(ctx)
	defer sche.scheduleRedis.Close()
	defer sche.streamRedis.Close()

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
		err = sche.scheduleRedis.ZAdd(ctx,
			sche.scheduleQueueKey,
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
			members, err := sche.scheduleRedis.ZRangeArgs(ctx, redis.ZRangeArgs{
				Key:     sche.scheduleQueueKey,
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
					_, err := sche.streamRedis.XAdd(ctx, &redis.XAddArgs{
						Stream: sche.jobStreamKey,
						Values: map[string]any{
							"payload": m,
						},
					}).Result()
					if err != nil {
						log.Printf("scheduler: enqueue job into stream: %v", err)
						continue
					}
					err = sche.scheduleRedis.ZRem(ctx,
						sche.scheduleQueueKey,
						m,
					).Err()
					if err != nil {
						log.Printf(
							"scheduler: remove dispatched job from queue: %v",
							err,
						)
						continue
					}
				}
			}
		case <-ctx.Done():
			return
		}
	}
}
