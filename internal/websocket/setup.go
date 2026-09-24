package websocket

import (
	"context"
	"encoding/json"
	"fmt"
	"platform/pkg/logger"
	"strconv"
	"strings"

	"github.com/centrifugal/centrifuge"
)

type contextKey string

const ctxKeyClientState contextKey = "clientState"

var rpcHandlers = map[string]RPCHandler{
	MethodRecordingStart:       HandleRecordingStart,
	MethodRecordingStop:        HandleRecordingStop,
	MethodRecordingBegin:       HandleRecordingBegin,
	MethodSessionInvite:        HandleSessionInvite,
	MethodSessionInviteDecline: HandleSessionInviteDecline,
	MethodSessionJoin:          HandleSessionJoin,
	MethodSessionLeave:         HandleSessionLeave,
}

func SetupNode(node *centrifuge.Node, deps *Deps) {
	node.OnConnecting(func(ctx context.Context, event centrifuge.ConnectEvent) (centrifuge.ConnectReply, error) {
		token := event.Token
		if token == "" {
			logger.Logger().Warn("centrifuge connect rejected: missing token")
			return centrifuge.ConnectReply{}, centrifuge.DisconnectInvalidToken
		}

		claims, err := deps.AuthService.ValidateJWT(token)
		if err != nil {
			logger.Logger().Warn(fmt.Sprintf("centrifuge connect rejected: invalid token: %v", err))
			return centrifuge.ConnectReply{}, centrifuge.DisconnectInvalidToken
		}

		user, err := deps.UserService.GetByID(claims.UserID)
		if err != nil || user == nil {
			logger.Logger().Warn(fmt.Sprintf("centrifuge connect rejected: user not found (id=%d)", claims.UserID))
			return centrifuge.ConnectReply{}, centrifuge.DisconnectInvalidToken
		}

		cs := &ClientState{
			User: user,
		}

		ctx = context.WithValue(ctx, ctxKeyClientState, cs)

		return centrifuge.ConnectReply{
			Context:     ctx,
			Credentials: &centrifuge.Credentials{UserID: fmt.Sprintf("%d", user.ID)},
			Subscriptions: map[string]centrifuge.SubscribeOptions{
				UserChannelName(user.ID): {},
				PresenceOnlineChannel:    {EmitPresence: true},
			},
		}, nil
	})

	node.OnConnect(func(client *centrifuge.Client) {
		cs, ok := client.Context().Value(ctxKeyClientState).(*ClientState)
		if !ok {
			client.Disconnect(centrifuge.DisconnectServerError)
			return
		}

		cs.sendFn = client.Send

		client.OnRPC(func(event centrifuge.RPCEvent, cb centrifuge.RPCCallback) {
			handler, ok := rpcHandlers[event.Method]
			if !ok {
				errResp, _ := json.Marshal(ErrorResponse{
					Type:    TypeError,
					Message: fmt.Sprintf("unknown method: %s", event.Method),
				})
				cb(centrifuge.RPCReply{Data: errResp}, nil)
				return
			}

			data, err := handler(cs, event.Data, deps)
			if err != nil {
				logger.Logger().Error(fmt.Sprintf("[USER:%s] RPC %s error: %v", client.UserID(), event.Method, err))
				errResp, _ := json.Marshal(ErrorResponse{
					Type:    TypeError,
					Message: err.Error(),
				})
				cb(centrifuge.RPCReply{Data: errResp}, nil)
				return
			}

			cb(centrifuge.RPCReply{Data: data}, nil)
		})

		client.OnMessage(func(event centrifuge.MessageEvent) {
			HandleAudioBinary(cs, event.Data, deps)
		})

		client.OnSubscribe(func(event centrifuge.SubscribeEvent, cb centrifuge.SubscribeCallback) {
			channel := event.Channel

			if channel == PresenceOnlineChannel {
				cb(centrifuge.SubscribeReply{
					Options: centrifuge.SubscribeOptions{EmitPresence: true},
				}, nil)
				return
			}

			// check if user has permission to sub to user channel
			if strings.HasPrefix(channel, "user:") {
				uidStr := strings.TrimPrefix(channel, "user:")
				if uidStr != fmt.Sprintf("%d", cs.User.ID) {
					cb(centrifuge.SubscribeReply{}, centrifuge.ErrorPermissionDenied)
					return
				}
				cb(centrifuge.SubscribeReply{}, nil)
				return
			}

			// check if user has access to channel
			if !strings.HasPrefix(channel, "session:") {
				cb(centrifuge.SubscribeReply{}, centrifuge.ErrorPermissionDenied)
				return
			}
			sidStr := strings.TrimPrefix(channel, "session:")
			sessionID, err := strconv.ParseUint(sidStr, 10, 64)
			if err != nil {
				cb(centrifuge.SubscribeReply{}, centrifuge.ErrorBadRequest)
				return
			}
			hasAccess, err := deps.SessionService.HasUserAccess(cs.User.ID, uint(sessionID))
			if err != nil || !hasAccess {
				cb(centrifuge.SubscribeReply{}, centrifuge.ErrorPermissionDenied)
				return
			}
			cb(centrifuge.SubscribeReply{
				Options: centrifuge.SubscribeOptions{
					EmitPresence: true,
				},
			}, nil)
			publishParticipantsUpdated(deps, uint(sessionID))
		})

		client.OnDisconnect(func(event centrifuge.DisconnectEvent) {
			link := cs.ClearLink()
			if link == nil {
				return
			}

			// On disconnect, we only remove the participant; ending the session is explicit.
			publishParticipantsUpdated(deps, link.SessionID)
		})
	})
}
