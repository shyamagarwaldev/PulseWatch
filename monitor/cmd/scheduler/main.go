package main

import "github.com/shyamagarwaldev/PulseWatch/monitor/internals/scheduler"

func main() {
	s := &scheduler.Scheduler{}
	s.Run()
}
