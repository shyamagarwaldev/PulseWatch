package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"github.com/shyamagarwaldev/PulseWatch/monitor/internals/outbox"
)

func main() {
	ctx, stop := signal.NotifyContext(
		context.Background(),
		os.Interrupt,
		syscall.SIGTERM,
	)
	defer stop()
	outbox := &outbox.OutBox{}
	outbox.Run(ctx)
}
