package shared

import "time"

type JobEvent struct {
	UserID    string    `db:"user_id" json:"user_id"`
	WebsiteID string    `db:"website_id" json:"website_id"`
	URL       string    `db:"url" json:"url"`
	Interval  int       `db:"interval_seconds" json:"interval_seconds"`
	NextTick  time.Time `db:"next_tick" json:"next_tick"`
}
