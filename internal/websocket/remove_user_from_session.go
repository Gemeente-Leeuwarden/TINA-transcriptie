package websocket

import "github.com/centrifugal/centrifuge"

func NotifyUserRemovalOfSession(node *centrifuge.Node, userID uint, sessionID uint) {
	payload := NotifyUserRemovalOfSessionMessage{
		Type:      TypeNotifyUserRemoval,
		SessionID: sessionID,
	}
	PublishToUser(node, userID, payload, "notify_user_removal")
}
