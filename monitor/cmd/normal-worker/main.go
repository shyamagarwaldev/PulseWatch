package main

import "github.com/shyamagarwaldev/PulseWatch/monitor/internals/worker"

func main() {
	normalWorker := &worker.NormalWorker{}
	normalWorker.Run()
}
