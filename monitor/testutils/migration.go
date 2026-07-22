package testutils

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"sort"

	"github.com/jackc/pgx/v5/pgxpool"
)

func ApplyMigrations(ctx context.Context, db *pgxpool.Pool) error {
	_, filename, _, ok := runtime.Caller(0)
	if !ok {
		return fmt.Errorf("unable to determine caller")
	}
	projectRoot := filepath.Join(filepath.Dir(filename), "..", "..")
	migrationsDir := filepath.Join(
		projectRoot,
		"backend",
		"prisma",
		"migrations",
	)
	entries, err := os.ReadDir(migrationsDir)
	if err != nil {
		return err
	}

	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Name() < entries[j].Name()
	})

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		sqlPath := filepath.Join(
			migrationsDir,
			entry.Name(),
			"migration.sql",
		)

		sqlBytes, err := os.ReadFile(sqlPath)
		if err != nil {
			return err
		}

		if _, err := db.Exec(ctx, string(sqlBytes)); err != nil {
			return err
		}
	}

	return nil
}
