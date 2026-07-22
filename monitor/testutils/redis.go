package testutils

import (
	"context"
	"net"
	"testing"

	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go/modules/valkey"
)

func SetupRedis(ctx context.Context, t *testing.T) *redis.Client {

	valkeyContainer, err := valkey.Run(ctx, "docker.io/valkey/valkey:7.2.5")
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, valkeyContainer.Terminate(ctx))
	})
	host, err := valkeyContainer.Host(ctx)
	require.NoError(t, err)

	port, err := valkeyContainer.MappedPort(ctx, "6379/tcp")
	require.NoError(t, err)

	rds := redis.NewClient(&redis.Options{
		Addr: net.JoinHostPort(host, port.Port()),
	})

	return rds

}
