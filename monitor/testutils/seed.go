package testutils

import (
	"context"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
)

func SeedUsers(ctx context.Context, pool *pgxpool.Pool, UserIDs []string) error {
	for i := range len(UserIDs) {
		_, err := pool.Exec(ctx,
			`
		INSERT INTO "User"
			(   id,
				username,
				password
			)
			VALUES
			($1,$2,$3)
		`,
			UserIDs[i],
			"shyam agarwal",
			"shyam agarwal",
		)
		if err != nil {
			return err
		}
	}
	return nil
}

func SeedWebsite(ctx context.Context, pool *pgxpool.Pool, WebsiteID string) error {
	_, err := pool.Exec(ctx,
		`
		INSERT INTO "Website"
			(
				id,
				url
			)
			VALUES
			($1,$2)
		`,
		WebsiteID,
		"https://google.com",
	)
	if err != nil {
		return err
	}
	return nil
}

func SeedUserWebsite(ctx context.Context, pool *pgxpool.Pool, UserIDs []string, WebsiteID string) error {
	for i := range len(UserIDs) {
		now := time.Now()
		_, err := pool.Exec(ctx,
			`
			INSERT INTO "UserWebsite"
				(
					user_id,
					website_id,
					time_added,
					next_tick
				)
				VALUES
				($1,$2,$3,$4)
			`,
			UserIDs[i],
			WebsiteID,
			now,
			now.Add(time.Second*300),
		)
		if err != nil {
			return err
		}
	}
	return nil
}

func SeedDb(ctx context.Context, t *testing.T, pool *pgxpool.Pool, keys [][]string) {
	UserIDs := keys[0]
	WebsiteID := keys[1][0]
	err := SeedUsers(ctx, pool, UserIDs)
	require.NoError(t, err)
	err = SeedWebsite(ctx, pool, WebsiteID)
	require.NoError(t, err)
	err = SeedUserWebsite(ctx, pool, UserIDs, WebsiteID)
	require.NoError(t, err)
}
