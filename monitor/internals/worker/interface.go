package worker

import (
	"context"
	"net/http"

	"github.com/redis/go-redis/v9"
)

type Worker interface {
	Init(ctx context.Context) error
	WorkerLoop(ctx context.Context)
	ProcessMessage(ctx context.Context, msg *redis.XMessage, client *http.Client) error
	Run()
}
