package scheduler

import (
	"context"
	"encoding/json"
	"testing"

	sh "github.com/shyamagarwaldev/PulseWatch/monitor/internals/shared"
	"github.com/shyamagarwaldev/PulseWatch/monitor/testutils"
	"github.com/stretchr/testify/require"
)

func TestLoadJobs(t *testing.T) {
	ctx := context.Background()
	pool := testutils.SetupPostgres(ctx, t)
	rds := testutils.SetupRedis(ctx, t)
	sche := &Scheduler{
		db:  pool,
		rds: rds,
	}
	UserIDs := testutils.GetBulkUUID(1)
	WebsiteIDs := testutils.GetBulkUUID(1)
	testutils.SeedDb(ctx, t, sche.db, [][]string{
		UserIDs,
		WebsiteIDs,
	})
	err := sche.LoadJobs(ctx)
	require.NoError(t, err)

	el := sh.CreateEl(UserIDs[0], WebsiteIDs[0])
	field, err := sche.rds.HGet(ctx, sh.HashKey, el).Result()
	require.NoError(t, err)
	var job sh.JobEvent
	err = json.Unmarshal([]byte(field), &job)
	require.NoError(t, err)
	require.Equal(t, UserIDs[0], job.UserID)
	require.Equal(t, WebsiteIDs[0], job.WebsiteID)
	members, err := sche.rds.ZRange(ctx, sh.SchedulerQueueKey, 0, -1).Result()
	require.NoError(t, err)
	require.Len(t, members, 1)
	require.Equal(t, el, members[0])
}

func TestLoadJobs_NoJobs(t *testing.T) {
	ctx := context.Background()
	pool := testutils.SetupPostgres(ctx, t)
	rds := testutils.SetupRedis(ctx, t)
	sche := &Scheduler{
		db:  pool,
		rds: rds,
	}
	err := sche.LoadJobs(ctx)
	require.NoError(t, err)
}
