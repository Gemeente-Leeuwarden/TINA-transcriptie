package websocket

import (
	"context"
	"encoding/json"
	"fmt"
	"platform/internal/service"
	"platform/pkg/logger"
	"strconv"

	"github.com/centrifugal/centrifuge"
)

type ParticipantInfo struct {
	UserID uint   `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
}

func publishParticipantsUpdated(deps *Deps, sessionID uint) {
	if deps == nil || deps.Node == nil {
		return
	}
	participants, err := ListSessionParticipants(context.Background(), deps.Node, deps.SessionService, sessionID)
	if err != nil {
		logger.Logger().Error(fmt.Sprintf("Failed to load session participants: %v", err))
		return
	}
	msg, err := json.Marshal(ParticipantsUpdatedNotification{
		Type:         TypeParticipantsUpdated,
		SessionID:    sessionID,
		Participants: participants,
	})
	if err != nil {
		logger.Logger().Error(fmt.Sprintf("Failed to marshal participants update: %v", err))
		return
	}
	if _, err := deps.Node.Publish(ChannelName(sessionID), msg); err != nil {
		logger.Logger().Error(fmt.Sprintf("Failed to publish participants update: %v", err))
	}
}

func ListOnlineUserIDs(node *centrifuge.Node) ([]uint, error) {
	if node == nil {
		return nil, fmt.Errorf("centrifuge node not available")
	}
	presence, err := node.Presence(PresenceOnlineChannel)
	if err != nil {
		return nil, err
	}
	ids := make([]uint, 0, len(presence.Presence))
	for _, info := range presence.Presence {
		uid, err := strconv.ParseUint(info.UserID, 10, 64)
		if err != nil || uid == 0 {
			continue
		}
		ids = append(ids, uint(uid))
	}
	return ids, nil
}

func ListSessionParticipants(_ context.Context, node *centrifuge.Node, sessionService *service.SessionService, sessionID uint) ([]ParticipantInfo, error) {
	if node == nil {
		return nil, fmt.Errorf("centrifuge node not available")
	}
	presence, err := node.Presence(ChannelName(sessionID))
	if err != nil {
		return nil, err
	}
	present := make(map[uint]struct{}, len(presence.Presence))
	for _, info := range presence.Presence {
		uid, err := strconv.ParseUint(info.UserID, 10, 64)
		if err != nil || uid == 0 {
			continue
		}
		present[uint(uid)] = struct{}{}
	}
	if len(present) == 0 {
		return nil, nil
	}

	members, err := sessionService.GetSessionMembers(sessionID)
	if err != nil {
		return nil, err
	}
	out := make([]ParticipantInfo, 0, len(members))
	for _, member := range members {
		if _, ok := present[member.UserID]; !ok {
			continue
		}
		out = append(out, ParticipantInfo{
			UserID: member.UserID,
			Email:  member.Email,
			Role:   string(member.Role),
		})
	}
	return out, nil
}
