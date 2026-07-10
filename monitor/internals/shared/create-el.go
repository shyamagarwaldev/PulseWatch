package shared

import "fmt"

func CreateEl(userID, websiteID string) string {
	return fmt.Sprintf("%v:%v", userID, websiteID)
}
