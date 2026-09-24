package websocket

import (
	"encoding/json"
	"fmt"
	"platform/pkg/logger"

	"github.com/centrifugal/centrifuge"
)

func PublishToSession(node *centrifuge.Node, sessionID uint, payload any, context string) {
	if node == nil {
		return
	}
	msg, err := json.Marshal(payload)
	if err != nil {
		logger.Logger().Error(fmt.Sprintf("%s marshal failed: %v", context, err))
		return
	}
	if _, err := node.Publish(ChannelName(sessionID), msg); err != nil {
		logger.Logger().Error(fmt.Sprintf("%s publish failed: %v", context, err))
	}
}

func PublishToUser(node *centrifuge.Node, userID uint, payload any, context string) {
	if node == nil {
		return
	}
	msg, err := json.Marshal(payload)
	if err != nil {
		logger.Logger().Error(fmt.Sprintf("%s marshal failed: %v", context, err))
		return
	}
	if _, err := node.Publish(UserChannelName(userID), msg); err != nil {
		logger.Logger().Error(fmt.Sprintf("%s publish failed: %v", context, err))
	}
}
