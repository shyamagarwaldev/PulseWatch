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

	"github.com/redis/go-redis/v9"

	sh "github.com/shyamagarwaldev/PulseWatch/monitor/internals/shared"
)

type NormalWorker struct {
	BaseWorker
}

func (w *NormalWorker) WorkerLoop(ctx context.Context) {
	client := &http.Client{
		Timeout: 10 * time.Second,
	}
	jobs := make(chan redis.XMessage, sh.BatchSize)
	var wg sync.WaitGroup
	defer wg.Wait()
	defer close(jobs)
	for range sh.WorkerCount {
		wg.Go(func() {
			for msg := range jobs {
				if err := w.ProcessMessage(ctx, &msg, client); err != nil {
					log.Printf("normal worker: ProcessMessage: process %s: %v", msg.ID, err)
				}
			}
		})
	}
	hostname, _ := os.Hostname()
	for {
		select {
		case <-ctx.Done():
			return
		default:
		}
		streams, err := w.rds.XReadGroup(ctx, &redis.XReadGroupArgs{
			Group:    sh.Workers,
			Consumer: fmt.Sprintf("NormalWorker: %v", hostname),
			Streams:  []string{sh.JobStreamKey, ">"},
			Count:    sh.BatchSize,
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
				select {
				case jobs <- msg:
				case <-ctx.Done():
					return
				}
			}
		}

	}
}

func (w *NormalWorker) ProcessMessage(ctx context.Context, msg *redis.XMessage, client *http.Client) error {
	el, ok := msg.Values["payload"].(string)
	if !ok {
		return fmt.Errorf("invalid payload")
	}
	var monitorJob sh.JobEvent
	payload, err := w.rds.HGet(ctx, sh.HashKey, el).Result()
	if errors.Is(err, redis.Nil) {
		return w.AckAndDelete(ctx, msg)
	}
	if err != nil {
		return fmt.Errorf("monitor data hash access: %w", err)
	}
	if err := json.Unmarshal([]byte(payload), &monitorJob); err != nil {
		return fmt.Errorf("unmarshal payload: %w", err)
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

func (w *NormalWorker) Run(ctx context.Context) {

	if err := w.Init(ctx); err != nil {
		log.Fatal(err)
	}

	// defer w.db.Close(ctx)
	defer w.db.Close()
	defer w.rds.Close()

	w.WorkerLoop(ctx)
}
