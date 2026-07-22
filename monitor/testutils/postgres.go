package testutils

import (
	"context"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
)

func SetupPostgres(ctx context.Context, t *testing.T) *pgxpool.Pool {

	pgContainer, err := postgres.Run(ctx,
		"postgres:17",
		postgres.WithDatabase("db"),
		postgres.WithUsername("postgres"),
		postgres.WithPassword("mysecretpassword"),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").
				WithOccurrence(2).WithStartupTimeout(5*time.Second)),
	)
	if err != nil {
		t.Fatal(err)
	}

	t.Cleanup(func() {
		if err := pgContainer.Terminate(ctx); err != nil {
			t.Fatalf("failed to terminate pgContainer: %s", err)
		}
	})

	contStr, err := pgContainer.ConnectionString(ctx, "sslmode=disable")
	require.NoError(t, err)
	pool, err := pgxpool.New(ctx, contStr)
	require.NoError(t, err)

	require.NoError(t, ApplyMigrations(ctx, pool))

	return pool
}
