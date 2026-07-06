package main

import "github.com/shyamagarwaldev/PulseWatch/monitor/internals/worker"

func main() {
	recoveryWorker := &worker.RecoveryWorker{}
	recoveryWorker.Run()
}
