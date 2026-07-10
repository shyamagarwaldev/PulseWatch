package outbox

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

type OutBoxTask struct {
	ID   string `db:"id" json:"id"`
	Task string `db:"task" json:"task"`
	sh.JobEvent
}

type OutBox struct {
	db  *pgxpool.Pool
	rds *redis.Client
}

func (out *OutBox) Init(ctx context.Context) error {
	pool, err := pgxpool.New(ctx, os.Getenv("DATABASE_URL"))
	if err != nil {
		return fmt.Errorf("connect postgres: %w", err)
	}
	err = pool.Ping(ctx)
	if err != nil {
		return fmt.Errorf("ping db: %w", err)
	}
	log.Printf("Successfully connected to postgres server!")
	out.db = pool
	out.rds = redis.NewClient(&redis.Options{
		Addr: os.Getenv("REDIS_ADDR"),
	})
	s, err := out.rds.Ping(ctx).Result()
	if err != nil {
		return fmt.Errorf("ping scheduler redis: %w", err)
	}
	log.Printf("Successfully connected to Redis server!: %v", s)
	return nil
}

func (out *OutBox) Run() {
	ctx := context.Background()

	if err := out.Init(ctx); err != nil {
		log.Fatal(err)
	}

	defer out.db.Close()
	defer out.rds.Close()

	out.OutBoxLoop(ctx)
}

func (out *OutBox) getTask(ctx context.Context) ([]OutBoxTask, error) {
	rows, err := out.db.Query(ctx,
		`WITH claimed AS (
			UPDATE "OutBox" o
			SET 
				task_status = 'Processing',
				updated_at = NOW()
			WHERE o.id IN (
				SELECT id
				FROM "OutBox"
				WHERE 
					(
						(task_status = 'UnProcessed')
						OR (
							task_status = 'Processing'
							AND updated_at < NOW() - INTERVAL '2 minutes'	
						)
					)
				ORDER BY updated_at
				LIMIT 10
				FOR UPDATE SKIP LOCKED
			)
			RETURNING id, task, user_id, website_id
		)
		SELECT
			c.id,
			c.task,
			uw.user_id,
			uw.website_id,
			w.url,
			uw.interval_seconds,
			uw.next_tick
		FROM claimed c
		JOIN "UserWebsite" uw
			ON uw.user_id = c.user_id
		AND uw.website_id = c.website_id
		JOIN "Website" w
			ON w.id = uw.website_id;`,
	)
	if err != nil {
		return nil, fmt.Errorf("Query Unprocessed Task: %w", err)
	}
	defer rows.Close()
	tasks, err := pgx.CollectRows(rows, pgx.RowToStructByName[OutBoxTask])
	if err != nil {
		return nil, fmt.Errorf("CollectRows: %w", err)
	}
	return tasks, nil
}

func (out *OutBox) markProcessed(ctx context.Context, processedIDs []string) error {
	if len(processedIDs) > 0 {
		_, err := out.db.Exec(
			ctx,
			`UPDATE "OutBox"
					SET task_status='Processed'
					WHERE id = ANY($1::text[])`,
			processedIDs,
		)
		if err != nil {
			return fmt.Errorf("markProcessed: failed to mark tasks processed: %w", err)
		}

	}
	return nil
}

func (out *OutBox) add(ctx context.Context, task *OutBoxTask, tx redis.Pipeliner) error {
	el := sh.CreateEl(task.UserID, task.WebsiteID)
	b, err := json.Marshal(task.JobEvent)
	if err != nil {
		return fmt.Errorf(
			"add: marshal job (user=%v website=%v): %w",
			task.UserID,
			task.WebsiteID,
			err,
		)
	}
	exists, err := out.rds.HExists(ctx, sh.HashKey, el).Result()
	if err != nil {
		return fmt.Errorf("add: HExists: %w", err)
	}
	if exists {
		return nil
	}
	tx.HSet(ctx, sh.HashKey, el, b)
	tx.ZAdd(ctx, sh.SchedulerQueueKey, redis.Z{
		Score:  float64(task.NextTick.UnixMilli()),
		Member: el,
	})
	return nil
}

func (out *OutBox) delete(ctx context.Context, task *OutBoxTask, tx redis.Pipeliner) error {
	el := sh.CreateEl(task.UserID, task.WebsiteID)
	tx.HDel(ctx, sh.HashKey, el)
	return nil
}

func (out *OutBox) update(ctx context.Context, task *OutBoxTask, tx redis.Pipeliner) error {
	b, err := json.Marshal(task.JobEvent)
	if err != nil {
		return fmt.Errorf(
			"update: marshal job (user=%v website=%v): %w",
			task.UserID,
			task.WebsiteID,
			err,
		)
	}
	el := sh.CreateEl(task.UserID, task.WebsiteID)
	tx.HSet(ctx, sh.HashKey, el, b)
	return nil
}

func (out *OutBox) OutBoxLoop(ctx context.Context) {
	ticker := time.NewTicker(time.Duration(sh.OutBoxLoopDuration) * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			tasks, err := out.getTask(ctx)
			if err != nil {
				log.Printf("OutBoxLoop: getTask: %v", err)
				continue
			}
			if len(tasks) == 0 {
				continue
			}
			processedIDs := make([]string, 0, len(tasks))
			tx := out.rds.TxPipeline()
			for _, task := range tasks {
				var err error
				switch task.Task {
				case "Add":
					err = out.add(ctx, &task, tx)
				case "Update":
					err = out.update(ctx, &task, tx)
				case "Delete":
					err = out.delete(ctx, &task, tx)
				default:
					log.Printf("OutBoxLoop: unknown task type %q", task.Task)
					continue
				}
				if err != nil {
					log.Printf("OutBoxLoop: %v", err)
					continue
				}
				processedIDs = append(processedIDs, task.ID)
			}
			if _, err = tx.Exec(ctx); err != nil {
				log.Printf("OutBoxLoop: redis pipeline failed: %v", err)
				continue // leave everything in Processing
			}
			if err := out.markProcessed(ctx, processedIDs); err != nil {
				log.Printf("OutBoxLoop: %v", err)
			}

		}
	}
}
