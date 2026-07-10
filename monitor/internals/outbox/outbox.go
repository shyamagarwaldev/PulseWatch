package outbox

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	sh "github.com/shyamagarwaldev/PulseWatch/monitor/internals/shared"
)

type OutBoxTask struct {
	ID string `db:"id" json:"id"`
	sh.JobEvent
}

type OutBox struct {
	db  *pgxpool.Pool
	rds *redis.Client
}

func (out *OutBox) OutBoxAddLoop(ctx context.Context) {
	ticker := time.NewTicker(time.Duration(sh.OutBoxLoopDuration) * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
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
							AND task = 'Add'
						ORDER BY updated_at
						LIMIT 10
						FOR UPDATE SKIP LOCKED
					)
					RETURNING id, user_id, website_id
				)
				SELECT
					c.id,
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
				log.Printf("OutBoxLoop: Query Unprocessed Task: %v", err)
				continue
			}
			tasks, err := pgx.CollectRows(rows, pgx.RowToStructByName[OutBoxTask])
			if err != nil {
				log.Printf("OutBoxAddLoop: CollectRows: %v", err)
				continue
			}
			if len(tasks) == 0 {
				continue
			}
			processedIDs := []string{}
			tx := out.rds.TxPipeline()
			for _, task := range tasks {
				el := sh.CreateEl(task.UserID, task.WebsiteID)
				b, err := json.Marshal(task.JobEvent)
				if err != nil {
					log.Printf(
						"OutBoxAddLoop: marshal job (user=%v website=%v): %v",
						task.UserID,
						task.WebsiteID,
						err,
					)
					continue
				}
				exists, err := out.rds.HExists(ctx, sh.HashKey, el).Result()
				if err != nil {
					log.Printf("OutBoxAddLoop: HExists: %v", err)
					continue
				}
				if exists {
					processedIDs = append(processedIDs, task.ID)
					continue
				}
				tx.HSet(ctx, sh.HashKey, el, b)
				tx.ZAdd(ctx, sh.SchedulerQueueKey, redis.Z{
					Score:  float64(task.NextTick.UnixMilli()),
					Member: el,
				})
				processedIDs = append(processedIDs, task.ID)
			}
			if _, err = tx.Exec(ctx); err != nil {
				log.Printf("redis pipeline failed: %v", err)
				continue // leave everything in Processing
			}
			if len(processedIDs) > 0 {
				_, err = out.db.Exec(
					ctx,
					`UPDATE "OutBox"
					SET task_status='Processed'
					WHERE id = ANY($1::text[])`,
					processedIDs,
				)
				if err != nil {
					log.Printf("failed to mark tasks processed: %v", err)
				}
			}

		}
	}
}
