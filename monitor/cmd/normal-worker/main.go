package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"github.com/shyamagarwaldev/PulseWatch/monitor/internals/worker"
)

func main() {
	ctx, stop := signal.NotifyContext(
		context.Background(),
		os.Interrupt,
		syscall.SIGTERM,
	)
	defer stop()
	normalWorker := &worker.NormalWorker{}
	normalWorker.Run(ctx)
}
