package worker

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/redis/go-redis/v9"

	sh "github.com/shyamagarwaldev/PulseWatch/monitor/internals/shared"
)

type RecoveryWorker struct {
	BaseWorker
}

func (w *RecoveryWorker) WorkerLoop(ctx context.Context) {
	client := &http.Client{
		Timeout: 5 * time.Second,
	}
	jobs := make(chan redis.XMessage, sh.BatchSize)
	var wg sync.WaitGroup
	defer wg.Wait()
	defer close(jobs)
	for range sh.WorkerCount {
		wg.Go(func() {
			for msg := range jobs {
				if err := w.ProcessMessage(ctx, &msg, client); err != nil {
					log.Printf("recovery worker: process: %s: %v", msg.ID, err)
				}
			}
		})
	}
	hostname, _ := os.Hostname()
	start := "0-0"
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			messages, st, err := w.rds.XAutoClaim(ctx, &redis.XAutoClaimArgs{
				Stream:   sh.JobStreamKey,
				Group:    sh.Workers,
				Consumer: fmt.Sprintf("RecoveryWorker: %v", hostname),
				MinIdle:  120 * time.Second,
				Start:    start,
				Count:    sh.BatchSize,
			}).Result()
			if err == redis.Nil {
				continue
			}
			if err != nil {
				log.Printf("recovery worker: xautoclaim: %v", err)
				continue
			}
			for _, msg := range messages {
				select {
				case jobs <- msg:
				case <-ctx.Done():
					return
				}
			}
			start = st
		}
	}
}

func (w *RecoveryWorker) ProcessMessage(ctx context.Context, msg *redis.XMessage, client *http.Client) error {
	el, ok := msg.Values["payload"].(string)
	if !ok {
		return fmt.Errorf("invalid payload")
	}
	payload, err := w.rds.HGet(ctx, sh.HashKey, el).Result()
	if errors.Is(err, redis.Nil) {
		return w.AckAndDelete(ctx, msg)
	}
	if err != nil {
		return fmt.Errorf("monitor data hash access: %w", err)
	}
	var monitorJob sh.JobEvent
	if err := json.Unmarshal([]byte(payload), &monitorJob); err != nil {
		return fmt.Errorf("unmarshal payload: %w", err)
	}
	err = w.db.QueryRow(ctx,
		`SELECT 1 FROM "WebsiteTick" WHERE id=$1`,
		msg.ID,
	).Scan(new(int))
	switch {
	case err == nil:
		return w.RecoverIncompleteProcessing(ctx, &monitorJob, msg, el)
	case errors.Is(err, pgx.ErrNoRows):
	default:
		return fmt.Errorf("idempotency query: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, monitorJob.URL, nil)
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}
	start := time.Now()
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("http worker check: %w", err)
	}
	defer resp.Body.Close()
	finish := time.Now()
	latency := finish.Sub(start).Milliseconds() // in ms
	success := resp.StatusCode >= 200 && resp.StatusCode < 300
	nextTick := finish.Add(time.Duration(monitorJob.Interval) * time.Second)
	status := "Down"
	if success {
		status = "Up"
	}

	if err := w.DbUpdateAndInsert(ctx, msg, nextTick, finish, &monitorJob, int64(latency), status); err != nil {
		return fmt.Errorf("DbUpdateAndInsert: %w", err)
	}

	if err := w.CacheUpdateAndStreamAck(ctx, nextTick, msg, el); err != nil {
		return fmt.Errorf("CacheUpdateAndStreamAck: %w", err)
	}

	return nil
}

func (w *RecoveryWorker) RecoverIncompleteProcessing(ctx context.Context, monitorJob *sh.JobEvent, msg *redis.XMessage, el string) error {
	var nextTick time.Time
	err := w.db.QueryRow(ctx,
		`SELECT next_tick FROM "UserWebsite" WHERE user_id=$1 AND website_id=$2`,
		monitorJob.UserID, monitorJob.WebsiteID,
	).Scan(&nextTick)
	// Defensive check.
	// Normally UserWebsite is soft deleted, so this path
	// should only occur if data has already been cleaned up.
	if errors.Is(err, pgx.ErrNoRows) {
		return w.AckAndDelete(ctx, msg)
	}
	if err != nil {
		return fmt.Errorf("RecoverIncompleteProcessing: CacheUpdateAndStreamAck: Query from UserWebsite : %w", err)
	}
	if err = w.CacheUpdateAndStreamAck(ctx, nextTick, msg, el); err != nil {
		return fmt.Errorf("RecoverIncompleteProcessing: CacheUpdateAndStreamAck: %w", err)
	}
	return nil
}

func (w *RecoveryWorker) Run(ctx context.Context) {
	if err := w.Init(ctx); err != nil {
		log.Fatal(err)
	}

	defer w.db.Close()
	defer w.rds.Close()

	w.WorkerLoop(ctx)
}
