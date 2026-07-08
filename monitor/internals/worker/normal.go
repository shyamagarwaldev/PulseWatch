package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
	job "github.com/shyamagarwaldev/PulseWatch/monitor/internals/shared"
	key "github.com/shyamagarwaldev/PulseWatch/monitor/internals/shared"
)

type NormalWorker struct {
	BaseWorker
}

func (w *NormalWorker) WorkerLoop(ctx context.Context) {
	client := &http.Client{
		Timeout: 5 * time.Second,
	}
	hostname, _ := os.Hostname()
	for {
		select {
		case <-ctx.Done():
			return
		default:
			streams, err := w.rds.XReadGroup(ctx, &redis.XReadGroupArgs{
				Group:    key.Workers,
				Consumer: fmt.Sprintf("NormalWorker: %v", hostname),
				Streams:  []string{key.JobStreamKey, ">"},
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
				var wg sync.WaitGroup
				for _, msg := range stream.Messages {
					wg.Add(1)
					go func(m redis.XMessage) {
						defer wg.Done()
						if err := w.ProcessMessage(ctx, &m, client); err != nil {
							log.Printf("normal worker: ProcessMessage: process %s: %v", m.ID, err)
						}
					}(msg)

				}
				wg.Wait()
			}
		}

	}
}

func (w *NormalWorker) ProcessMessage(ctx context.Context, msg *redis.XMessage, client *http.Client) error {
	payload, ok := msg.Values["payload"].(string)
	if !ok {
		return fmt.Errorf("invalid payload")
	}
	var monitorJob job.JobEvent
	if err := json.Unmarshal([]byte(payload), &monitorJob); err != nil {
		return fmt.Errorf("unmarsharl payload: %w", err)
	}
	start := time.Now()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, monitorJob.URL, nil)
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
	monitorJob.NextTick = time.Now().Add(time.Duration(monitorJob.Interval) * time.Second)
	status := "Down"
	if success {
		status = "Up"
	}

	if err := w.DbUpdateAndInsert(ctx, msg, &monitorJob, int64(latency), status); err != nil {
		return fmt.Errorf("DbUpdateAndInsert: %w", err)
	}

	if err := w.CacheUpdateAndStreamAck(ctx, &monitorJob, msg); err != nil {
		return fmt.Errorf("CacheUpdateAndStreamAck: %w", err)
	}

	return nil
}

func (w *NormalWorker) Run() {
	ctx := context.Background()

	if err := w.Init(ctx); err != nil {
		log.Fatal(err)
	}

	// defer w.db.Close(ctx)
	defer w.db.Close()
	defer w.rds.Close()

	w.WorkerLoop(ctx)
}
