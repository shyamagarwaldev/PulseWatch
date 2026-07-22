package scheduler

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"
	sh "github.com/shyamagarwaldev/PulseWatch/monitor/internals/shared"
	"github.com/shyamagarwaldev/PulseWatch/monitor/testutils"
	"github.com/stretchr/testify/require"
)

func setupScheduler(t *testing.T) (*Scheduler, context.Context) {
	ctx := context.Background()
	rds := testutils.SetupRedis(ctx, t)
	sche := &Scheduler{
		rds: rds,
	}
	t.Cleanup(func() {
		_ = sche.rds.Close()
	})
	return sche, ctx
}

func TestProcessOnce_PublishDueJobs(t *testing.T) {
	sche, ctx := setupScheduler(t)
	job1 := "user1:website1"

	err := sche.rds.ZAdd(ctx, sh.SchedulerQueueKey, redis.Z{
		Member: job1,
		Score:  float64(time.Now().Add(-time.Second).UnixMilli()),
	}).Err()

	require.NoError(t, err)

	err = sche.ProcessOnce(ctx)
	require.NoError(t, err)

	entries, err := sche.rds.XRange(ctx, sh.JobStreamKey, "-", "+").Result()
	require.NoError(t, err)
	require.Len(t, entries, 1)

	payload := entries[0].Values["payload"]
	require.Equal(t, job1, payload)

	members, err := sche.rds.ZRange(ctx, sh.SchedulerQueueKey, 0, -1).Result()
	require.NoError(t, err)
	require.Empty(t, members)
}

func TestProcessOnce_IgnoreFutureJobs(t *testing.T) {
	sche, ctx := setupScheduler(t)

	job1 := "user1:website1"

	err := sche.rds.ZAdd(ctx, sh.SchedulerQueueKey, redis.Z{
		Member: job1,
		Score:  float64(time.Now().Add(time.Second * 60).UnixMilli()),
	}).Err()

	require.NoError(t, err)

	err = sche.ProcessOnce(ctx)
	require.NoError(t, err)

	entries, err := sche.rds.XRange(ctx, sh.JobStreamKey, "-", "+").Result()
	require.NoError(t, err)
	require.Len(t, entries, 0)

	members, err := sche.rds.ZRange(ctx, sh.SchedulerQueueKey, 0, -1).Result()
	require.NoError(t, err)
	require.Len(t, members, 1)
}

func TestProcessOnce_PublishOnlyDueJobs(t *testing.T) {
	sche, ctx := setupScheduler(t)
	jobs := make([]string, 4)
	now := time.Now()
	score := []int64{
		now.Add(-time.Second * 60).UnixMilli(),
		now.Add(-time.Second).UnixMilli(),
		now.Add(time.Second * 60).UnixMilli(),
		now.Add(time.Second * 2 * 60).UnixMilli(),
	}
	for i := range jobs {
		jobs[i] = fmt.Sprintf("user%d:website%d", i+1, i+1)
	}
	pipe := sche.rds.Pipeline()
	for i := range jobs {
		pipe.ZAdd(ctx, sh.SchedulerQueueKey, redis.Z{
			Score:  float64(score[i]),
			Member: jobs[i],
		})
	}
	_, err := pipe.Exec(ctx)
	require.NoError(t, err)

	err = sche.ProcessOnce(ctx)
	require.NoError(t, err)
	entries, err := sche.rds.XRange(ctx, sh.JobStreamKey, "-", "+").Result()
	require.NoError(t, err)
	require.Len(t, entries, 2)

	payloads := make([]string, 2)
	for i := range entries {
		payloads[i] = entries[i].Values["payload"].(string)
	}
	require.ElementsMatch(t, payloads, jobs[0:2])
	members, err := sche.rds.ZRange(ctx, sh.SchedulerQueueKey, 0, -1).Result()
	require.NoError(t, err)
	require.Len(t, members, 2)
	require.ElementsMatch(t, members, jobs[2:4])
}

func TestProcessOnce_EmptyQueue(t *testing.T) {
	sche, ctx := setupScheduler(t)

	err := sche.ProcessOnce(ctx)
	require.NoError(t, err)

	entries, err := sche.rds.XRange(ctx, sh.JobStreamKey, "-", "+").Result()
	require.NoError(t, err)
	require.Len(t, entries, 0)

	members, err := sche.rds.ZRange(ctx, sh.SchedulerQueueKey, 0, -1).Result()
	require.NoError(t, err)
	require.Len(t, members, 0)
}

func TestProcessOnce_Idempotency(t *testing.T) {
	sche, ctx := setupScheduler(t)
	job1 := "user1:website1"

	err := sche.rds.ZAdd(ctx, sh.SchedulerQueueKey, redis.Z{
		Member: job1,
		Score:  float64(time.Now().Add(-time.Second).UnixMilli()),
	}).Err()

	require.NoError(t, err)

	err = sche.ProcessOnce(ctx)
	require.NoError(t, err)
	err = sche.ProcessOnce(ctx)
	require.NoError(t, err)

	entries, err := sche.rds.XRange(ctx, sh.JobStreamKey, "-", "+").Result()
	require.NoError(t, err)
	require.Len(t, entries, 1)

	payload := entries[0].Values["payload"]
	require.Equal(t, job1, payload)
}
