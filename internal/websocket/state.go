package websocket

import (
	"platform/internal/database/models"
	"sync"
)

type ParticipantLink struct {
	SessionID   uint
	IsOwner     bool
	IsModerator bool
}

type ClientState struct {
	mu     sync.Mutex
	User   *models.User
	link   *ParticipantLink
	sendFn func([]byte) error
}

func (cs *ClientState) GetLink() *ParticipantLink {
	cs.mu.Lock()
	defer cs.mu.Unlock()
	return cs.link
}

func (cs *ClientState) SetLink(link *ParticipantLink) {
	cs.mu.Lock()
	defer cs.mu.Unlock()
	cs.link = link
}

func (cs *ClientState) ClearLink() *ParticipantLink {
	cs.mu.Lock()
	defer cs.mu.Unlock()
	l := cs.link
	cs.link = nil
	return l
}
