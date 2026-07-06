package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/redis/go-redis/v9"
	job "github.com/shyamagarwaldev/PulseWatch/monitor/internals/types"
)

type RecoveryWorker struct {
	*BaseWorker
}

func (w *RecoveryWorker) WorkerLoop(ctx context.Context) {
	client := &http.Client{
		Timeout: 5 * time.Second,
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
			Messages, st, err := w.streamRedis.XAutoClaim(ctx, &redis.XAutoClaimArgs{
				Stream:   JobStreamKey,
				Group:    Workers,
				Consumer: fmt.Sprintf("RecoveryWorker: %v", hostname),
				MinIdle:  120 * time.Second,
				Start:    start,
				Count:    10,
			}).Result()
			if err == redis.Nil {
				continue
			}
			if err != nil {
				log.Printf("recovery worker: xautoclaim: %v", err)
				continue
			}

			for _, msg := range Messages {
				if err := w.ProcessMessage(ctx, &msg, client); err != nil {
					log.Printf("recovery worker: process: %s: %v", msg.ID, err)
				}

			}
			start = st
		}
	}
}

func (w *RecoveryWorker) ProcessMessage(ctx context.Context, msg *redis.XMessage, client *http.Client) error {
	payload, ok := msg.Values["payload"].(string)
	if !ok {
		return fmt.Errorf("invalid payload")
	}
	var job job.JobEvent
	if err := json.Unmarshal([]byte(payload), &job); err != nil {
		return fmt.Errorf("error in json unmarsharl: %w", err)
	}
	var websiteID, userID string
	err := w.db.QueryRow(ctx,
		`SELECT user_id,website_id FROM "WebsiteTick" WHERE id=$1`,
		msg.ID,
	).Scan(&userID, &websiteID)
	switch err {
	case nil:
		return w.RecoverIncompleteProcessing(ctx, userID, websiteID, &job, msg)
	case pgx.ErrNoRows:
	default:
		return fmt.Errorf("idempotency query: %w", err)
	}
	start := time.Now()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, job.URL, nil)
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("http worker check: %w", err)
	}
	defer resp.Body.Close()
	success := resp.StatusCode >= 200 && resp.StatusCode < 300
	latency := time.Since(start).Milliseconds() // in ms
	job.NextTick = job.NextTick.Add(time.Duration(job.Interval) * time.Second)

	status := "DOWN"
	if success {
		status = "UP"
	}

	if err := w.DbUpdateAndInsert(ctx, msg, &job, int64(latency), status); err != nil {
		return fmt.Errorf("ProcessMessage DbUpdateAndInsert: %w", err)
	}

	if err := w.ReEnqueue(ctx, &job); err != nil {
		return fmt.Errorf("ProcessMessage ReEnqueue: %w", err)
	}

	if err := w.RSAck(ctx, msg); err != nil {
		return fmt.Errorf("ProcessMessage RSAck: %w", err)
	}

	return nil
}

func (w *RecoveryWorker) RecoverIncompleteProcessing(ctx context.Context, userID, websiteID string, job *job.JobEvent, msg *redis.XMessage) error {
	var nextTick time.Time
	err := w.db.QueryRow(ctx,
		`SELECT next_tick FROM "UserWebsite" WHERE user_id=$1 AND website_id=$2`,
		userID, websiteID,
	).Scan(&nextTick)

	if err != nil {
		return fmt.Errorf("RecoverIncompleteProcessing: Query from UserWebsite : %w", err)
	}
	job.NextTick = nextTick
	b, err := json.Marshal(job)
	if err != nil {
		return fmt.Errorf(
			"marshal job (user=%s website=%s): %w",
			job.UserID,
			job.WebsiteID,
			err,
		)
	}
	err = w.scheduleRedis.ZScore(ctx,
		SchedulerQueueKey,
		string(b),
	).Err()

	switch {
	case err == redis.Nil:
		if err := w.ReEnqueue(ctx, job); err != nil {
			return fmt.Errorf("RecoverIncompleteProcessing ReEnqueue: %w", err)
		}
	case err != nil:
		return fmt.Errorf("redis scheduler element exist: %w", err)
	}

	if err := w.RSAck(ctx, msg); err != nil {
		return fmt.Errorf("RecoverIncompleteProcessing RSAck: %w", err)
	}

	return nil
}

func (w *RecoveryWorker) Run() {
	ctx := context.Background()

	if err := w.Init(ctx); err != nil {
		log.Fatal(err)
	}

	defer w.db.Close(ctx)
	defer w.scheduleRedis.Close()
	defer w.streamRedis.Close()

	w.WorkerLoop(ctx)
}
