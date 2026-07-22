package testutils

import (
	"github.com/google/uuid"
)

func GetUUID() string {
	id := uuid.New()

	return id.String()
}

func GetBulkUUID(n int) []string {
	keys := make([]string, n)

	for i := range n {
		keys[i] = GetUUID()
	}
	return keys
}
