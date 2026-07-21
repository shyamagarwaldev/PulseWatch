package scheduler

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	sh "github.com/shyamagarwaldev/PulseWatch/monitor/internals/shared"
)

type Scheduler struct {
	db  *pgxpool.Pool
	rds *redis.Client
}

const batch = 1000

func (sche *Scheduler) Init(ctx context.Context) error {
	pool, err := pgxpool.New(ctx, os.Getenv("DATABASE_URL"))
	if err != nil {
		return fmt.Errorf("connect postgres: %w", err)
	}
	err = pool.Ping(ctx)
	if err != nil {
		return fmt.Errorf("ping db: %w", err)
	}
	log.Printf("Successfully connected to postgres server!")
	sche.db = pool
	sche.rds = redis.NewClient(&redis.Options{
		Addr: os.Getenv("REDIS_ADDR"),
	})
	s, err := sche.rds.Ping(ctx).Result()
	if err != nil {
		return fmt.Errorf("ping scheduler redis: %w", err)
	}
	log.Printf("Successfully connected to Redis server!: %v", s)
	tx := sche.rds.TxPipeline()
	tx.Del(ctx, sh.HashKey)
	tx.Del(ctx, sh.SchedulerQueueKey)
	if _, err := tx.Exec(ctx); err != nil {
		return fmt.Errorf("clear scheduler cache: %w", err)
	}
	return nil
}

func (sche *Scheduler) Run(ctx context.Context) {
	if err := sche.Init(ctx); err != nil {
		log.Fatal(err)
	}

	defer sche.db.Close()
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
		ON uw.website_id = w.id
		WHERE uw.is_active;
    `)
	if err != nil {
		return fmt.Errorf("query scheduler jobs: %w", err)
	}
	defer rows.Close()
	jobs, err := pgx.CollectRows(rows, pgx.RowToStructByName[sh.JobEvent])

	if err != nil {
		return fmt.Errorf("collect scheduler jobs: %w", err)
	}
	if len(jobs) == 0 {
		return nil
	}
	tx := sche.rds.TxPipeline()
	// O(M * log M)
	for _, monitorJob := range jobs {
		b, err := json.Marshal(monitorJob)
		if err != nil {
			return fmt.Errorf(
				"marshal job (user=%s website=%s): %w",
				monitorJob.UserID,
				monitorJob.WebsiteID,
				err,
			)
		}
		el := sh.CreateEl(monitorJob.UserID, monitorJob.WebsiteID)
		// O (logM)
		tx.ZAdd(ctx,
			sh.SchedulerQueueKey,
			redis.Z{
				Score:  float64(monitorJob.NextTick.UnixMilli()), // -> see this later
				Member: el,
			},
		)
		// O (1)
		tx.HSet(ctx, sh.HashKey, el, string(b))
	}
	if _, err := tx.Exec(ctx); err != nil {
		return fmt.Errorf("load jobs tx: %w", err)
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
			if err := sche.ProcessOnce(ctx); err != nil {
				log.Printf("scheduler: %v \n", err)
			}
		case <-ctx.Done():
			return
		}
	}
}

func (sche *Scheduler) ProcessOnce(ctx context.Context) error {
	now := time.Now().UnixMilli()
	// O (M + Log N)
	members, err := sche.rds.ZRangeArgs(ctx, redis.ZRangeArgs{
		Key:     sh.SchedulerQueueKey,
		Start:   "-inf",
		Stop:    fmt.Sprintf("%d", now),
		ByScore: true,
	}).Result()
	if err != nil {
		return fmt.Errorf("fetch due jobs: %w", err)
	}
	// O (M * Log N)

	for i := 0; i < len(members); i += batch {
		end := min(i+batch, len(members))
		tx := sche.rds.TxPipeline()
		for _, el := range members[i:end] {
			tx.XAdd(ctx, &redis.XAddArgs{
				Stream: sh.JobStreamKey,
				Values: map[string]string{
					"payload": el,
				},
			})
			tx.ZRem(ctx, sh.SchedulerQueueKey, el)
		}
		if _, err = tx.Exec(ctx); err != nil {
			return fmt.Errorf("transaction failed: %w", err)
		}
	}
	return nil
}
