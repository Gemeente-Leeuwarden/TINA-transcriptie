package websocket

import "fmt"

const PresenceOnlineChannel = "presence:online"

func ChannelName(sessionID uint) string {
	return fmt.Sprintf("session:%d", sessionID)
}

func UserChannelName(userID uint) string {
	return fmt.Sprintf("user:%d", userID)
}
