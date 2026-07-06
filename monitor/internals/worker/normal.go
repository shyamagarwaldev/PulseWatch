package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/redis/go-redis/v9"
	job "github.com/shyamagarwaldev/PulseWatch/monitor/internals/types"
)

type NormalWorker struct {
	*BaseWorker
}

func (w *NormalWorker) WorkerLoop(ctx context.Context) {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()
	client := &http.Client{
		Timeout: 5 * time.Second,
	}
	hostname, _ := os.Hostname()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			streams, err := w.streamRedis.XReadGroup(ctx, &redis.XReadGroupArgs{
				Group:    Workers,
				Consumer: fmt.Sprintf("NormalWorker: %v", hostname),
				Streams:  []string{JobStreamKey, ">"},
				Count:    10,
				Block:    5 * time.Second,
			}).Result()
			if err == redis.Nil {
				continue
			}
			if err != nil {
				log.Printf("normal worker: read group: %v", err)
				continue
			}
			for _, stream := range streams {
				for _, msg := range stream.Messages {
					if err := w.ProcessMessage(ctx, &msg, client); err != nil {
						log.Printf("normal worker: process %s: %v", msg.ID, err)
					}

				}
			}
		}

	}
}

func (w *NormalWorker) ProcessMessage(ctx context.Context, msg *redis.XMessage, client *http.Client) error {
	payload, ok := msg.Values["payload"].(string)
	if !ok {
		return fmt.Errorf("invalid payload")
	}
	var job job.JobEvent
	if err := json.Unmarshal([]byte(payload), &job); err != nil {
		return fmt.Errorf("error in json unmarsharl: %w", err)
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

func (w *NormalWorker) Run() {
	ctx := context.Background()

	if err := w.Init(ctx); err != nil {
		log.Fatal(err)
	}

	defer w.db.Close(ctx)
	defer w.scheduleRedis.Close()
	defer w.streamRedis.Close()

	w.WorkerLoop(ctx)
}
