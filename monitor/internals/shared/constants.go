package shared

type Key string

const (
	SchedulerQueueKey = "scheduler:queue"
	JobStreamKey      = "jobs:stream"
	HashKey           = "monitor:hash"
	// UniqueViolationCode = "23505"
)

type ConsumerGroup string

const (
	Workers = "Workers"
)

type Duration int

const (
	OutBoxLoopDuration = 60
)
