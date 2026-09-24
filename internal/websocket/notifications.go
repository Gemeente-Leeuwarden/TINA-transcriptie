package websocket

import "github.com/centrifugal/centrifuge"

func PublishNotificationToUser(
	node *centrifuge.Node,
	userID uint,
	level NotificationLevel,
	title, message, link string,
) {
	payload := NotificationMessage{
		Type:    MessageType(TypeNotification),
		Level:   level,
		Title:   title,
		Message: message,
		Link:    link,
	}
	PublishToUser(node, userID, payload, "notification")
}

func PublishNotificationToSession(
	node *centrifuge.Node,
	sessionID uint,
	level NotificationLevel,
	title, message, link string,
) {
	payload := NotificationMessage{
		Type:    MessageType(TypeNotification),
		Level:   level,
		Title:   title,
		Message: message,
		Link:    link,
	}
	PublishToSession(node, sessionID, payload, "notification")
}
