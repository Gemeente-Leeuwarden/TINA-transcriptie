package websocket

import (
	"encoding/json"
	"fmt"
	"platform/pkg/logger"

	"github.com/centrifugal/centrifuge"
)

func PublishActiveSessionsUpdated(node *centrifuge.Node, userIDs []uint) {
	if node == nil || len(userIDs) == 0 {
		return
	}
	msg, err := json.Marshal(ActiveSessionsUpdatedNotification{
		Type: TypeActiveSessionsUpdated,
	})
	if err != nil {
		logger.Logger().Error(fmt.Sprintf("Failed to marshal active sessions update: %v", err))
		return
	}
	for _, userID := range userIDs {
		if _, err := node.Publish(UserChannelName(userID), msg); err != nil {
			logger.Logger().Error(fmt.Sprintf("Failed to publish active sessions update: %v", err))
		}
	}
}
