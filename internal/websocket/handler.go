package websocket

import (
	"encoding/json"
	"fmt"
	"platform/internal/database/models"
	q "platform/internal/queue"
	"platform/internal/service"
	"platform/pkg/logger"
	"platform/pkg/rabbitmq"
	"strings"

	"github.com/centrifugal/centrifuge"
	"gorm.io/gorm/utils"
)

type Deps struct {
	AuthService    *service.AuthService
	UserService    *service.UserService
	SessionService *service.SessionService
	PurposeService *service.PurposeService
	Node           *centrifuge.Node
	RabbitMQ       *rabbitmq.Client
	MinioBucket    string
}

// RPCHandler is the signature for all request-response handlers.
type RPCHandler func(state *ClientState, data []byte, deps *Deps) ([]byte, error)

// BinaryHandler is the signature for the streaming audio handler.
type BinaryHandler func(state *ClientState, data []byte, deps *Deps)

func HandleRecordingStart(state *ClientState, data []byte, deps *Deps) ([]byte, error) {
	user := state.User

	if link := state.GetLink(); link != nil {
		return nil, fmt.Errorf("already in a session %d", link.SessionID)
	}

	var req RecordingStartRequest
	if err := json.Unmarshal(data, &req); err != nil {
		return nil, fmt.Errorf("ongeldig verzoek: %w", err)
	}
	if err := validateRequest(&req); err != nil {
		return nil, fmt.Errorf("ongeldig verzoek: %w", err)
	}

	ses, err := deps.SessionService.GetActiveSessionByUser(user)
	if err != nil {
		logger.Logger().Error(fmt.Sprintf("[USER:%s] Failed to get active recording session: %v", user.Email, err))
		return nil, err
	}

	if ses != nil {
		logger.Logger().Info(fmt.Sprintf("[USER:%s] User already has an active recording session id:%s", user.Email, utils.ToString(ses.ID)))
		return nil, fmt.Errorf("already recording on id %s, start a resume instead", utils.ToString(ses.ID))
	}

	purpose, err := deps.PurposeService.GetByIDForUser(req.PurposeID, user.ID)
	if err != nil {
		return nil, fmt.Errorf("doel niet gevonden")
	}

	nSes, err := deps.SessionService.CreateNewSession(user, purpose.ID)
	if err != nil {
		logger.Logger().Error(fmt.Sprintf("[USER:%s] Failed to create new recording session: %v", user.Email, err))
		return nil, err
	}

	if err := deps.SessionService.UpdateStatus(nSes, models.StatusRecording); err != nil {
		logger.Logger().Error(fmt.Sprintf("[USER:%s] Failed to update session status: %v", user.Email, err))
		return nil, err
	}
	PublishToSession(
		deps.Node,
		nSes.ID,
		SessionStartedNotification{
			Type:      TypeSessionStarted,
			SessionID: nSes.ID,
			Status:    string(models.StatusRecording),
		},
		fmt.Sprintf("[USER:%s] session_started", user.Email),
	)

	state.SetLink(&ParticipantLink{
		SessionID:   nSes.ID,
		IsOwner:     true,
		IsModerator: false,
	})
	publishParticipantsUpdated(deps, nSes.ID)
	if userIDs, err := deps.SessionService.GetSessionUserIDs(nSes.ID); err == nil {
		PublishActiveSessionsUpdated(deps.Node, userIDs)
	}

	return json.Marshal(RecordingStartedResponse{
		Type:       MethodRecordingStart,
		SessionID:  utils.ToString(nSes.ID),
		InviteCode: nSes.InviteCode,
		Purpose:    buildPurposeInfo(purpose),
	})
}

func HandleRecordingStop(state *ClientState, _ []byte, deps *Deps) ([]byte, error) {
	user := state.User

	link := state.ClearLink()
	if link == nil {
		return nil, fmt.Errorf("no active recording session")
	}
	if !link.IsOwner {
		state.SetLink(link) // restore link
		return nil, fmt.Errorf("only the session owner can stop recording, use session_leave instead")
	}

	// Broadcast session_ended to all participants
	PublishToSession(
		deps.Node,
		link.SessionID,
		SessionEndedNotification{
			Type:      TypeSessionEnded,
			SessionID: link.SessionID,
		},
		fmt.Sprintf("[USER:%s] session_ended", user.Email),
	)

	ses, err := deps.SessionService.GetByIDWithPurpose(link.SessionID)
	if err != nil {
		logger.Logger().Error(fmt.Sprintf("[USER:%s] Failed to get session for status update: %v", user.Email, err))
	} else {
		if err := deps.SessionService.UpdateStatus(ses, models.StatusTranscribing); err != nil {
			logger.Logger().Error(fmt.Sprintf("[USER:%s] Failed to update session status: %v", user.Email, err))
		}
		if deps.RabbitMQ != nil {
			segments, err := deps.SessionService.GetSegmentsBySession(ses.ID)
			if err != nil {
				logger.Logger().Error(fmt.Sprintf("[USER:%s] Failed to load segments for session %d: %v", user.Email, ses.ID, err))
			} else if len(segments) == 0 {
				logger.Logger().Error(fmt.Sprintf("[USER:%s] No segments found for session %d, skipping transcription queue", user.Email, ses.ID))
			} else {
				segInfos := make([]q.SegmentInfo, 0, len(segments))
				for _, seg := range segments {
					segInfos = append(segInfos, q.SegmentInfo{
						UserID:      fmt.Sprintf("%d", seg.UserID),
						ObjectName:  seg.ObjectName,
						ContentType: seg.ContentType,
						StartedAtMs: seg.StartedAt.UnixMilli(),
						EndedAtMs:   seg.EndedAt.UnixMilli(),
					})
				}
				purposeInfo, promptInfo := q.BuildPurposePromptInfo(ses.Purpose)
				msg, err := json.Marshal(q.MessageRecordingReady{
					Type:      q.MessageTypeRecordingReady,
					SessionID: fmt.Sprintf("%d", ses.ID),
					Bucket:    deps.MinioBucket,
					Segments:  segInfos,
					Purpose:   purposeInfo,
					Prompt:    promptInfo,
				})
				if err != nil {
					logger.Logger().Error(fmt.Sprintf("[USER:%s] Recording ready queue message marshal failed: %v", user.Email, err))
				} else if err := deps.RabbitMQ.Publish("", "session", msg); err != nil {
					logger.Logger().Error(fmt.Sprintf("[USER:%s] Recording ready queue publish failed: %v", user.Email, err))
				}
			}
		}
		if userIDs, err := deps.SessionService.GetSessionUserIDs(ses.ID); err == nil {
			PublishActiveSessionsUpdated(deps.Node, userIDs)
		}
	}

	resp, err := json.Marshal(RecordingStoppedResponse{
		Type:         MethodRecordingStop,
		SessionID:    link.SessionID,
		TotalChunks:  0,
		TotalAudioMs: 0,
	})
	if err != nil {
		return nil, err
	}

	return resp, nil
}

func HandleRecordingBegin(state *ClientState, data []byte, deps *Deps) ([]byte, error) {
	if link := state.GetLink(); link != nil {
		return nil, fmt.Errorf("je neemt al op in sessie %d", link.SessionID)
	}

	var req RecordingBeginRequest
	if err := json.Unmarshal(data, &req); err != nil {
		return nil, fmt.Errorf("ongeldig verzoek: %w", err)
	}
	if err := validateRequest(&req); err != nil {
		return nil, fmt.Errorf("ongeldig verzoek: %w", err)
	}

	hasAccess, err := deps.SessionService.HasUserAccess(state.User.ID, req.SessionID)
	if err != nil || !hasAccess {
		return nil, fmt.Errorf("geen toegang tot sessie %d", req.SessionID)
	}

	role, err := deps.SessionService.GetUserRole(state.User.ID, req.SessionID)
	if err != nil {
		return nil, fmt.Errorf("sessierol laden mislukt")
	}
	if role != models.RoleOwner {
		return nil, fmt.Errorf("alleen de eigenaar kan opnemen starten")
	}

	ses, err := deps.SessionService.GetByIDWithPurpose(req.SessionID)
	if err != nil {
		return nil, fmt.Errorf("sessie niet gevonden")
	}
	if ses.PurposeID == nil {
		return nil, fmt.Errorf("doel is verplicht om te starten")
	}
	if ses.Status == models.StatusRecording {
		return nil, fmt.Errorf("sessie is al aan het opnemen")
	}
	if ses.Status != models.StatusNew {
		return nil, fmt.Errorf("sessie is niet klaar om op te nemen")
	}

	if err := deps.SessionService.UpdateStatus(ses, models.StatusRecording); err != nil {
		return nil, fmt.Errorf("sessiestatus bijwerken mislukt: %w", err)
	}
	PublishToSession(
		deps.Node,
		ses.ID,
		SessionStartedNotification{
			Type:      TypeSessionStarted,
			SessionID: ses.ID,
			Status:    string(models.StatusRecording),
		},
		fmt.Sprintf("[USER:%s] session_started", state.User.Email),
	)

	state.SetLink(&ParticipantLink{
		SessionID:   ses.ID,
		IsOwner:     true,
		IsModerator: false,
	})
	publishParticipantsUpdated(deps, ses.ID)
	if userIDs, err := deps.SessionService.GetSessionUserIDs(ses.ID); err == nil {
		PublishActiveSessionsUpdated(deps.Node, userIDs)
	}

	return json.Marshal(RecordingStartedResponse{
		Type:       MethodRecordingBegin,
		SessionID:  utils.ToString(ses.ID),
		InviteCode: ses.InviteCode,
		Purpose:    buildPurposeInfo(ses.Purpose),
	})
}

func HandleAudioBinary(state *ClientState, data []byte, deps *Deps) {
	_ = state
	_ = data
	_ = deps
}

func HandleSessionInvite(state *ClientState, data []byte, deps *Deps) ([]byte, error) {
	var req SessionInviteRequest
	if err := json.Unmarshal(data, &req); err != nil {
		return nil, fmt.Errorf("ongeldig verzoek: %w", err)
	}
	if err := validateRequest(&req); err != nil {
		return nil, fmt.Errorf("ongeldig verzoek: %w", err)
	}
	if strings.EqualFold(req.Email, state.User.Email) {
		return nil, fmt.Errorf("je bent al deelnemer van deze sessie")
	}

	sessionID := uint(0)
	if link := state.GetLink(); link != nil {
		if !link.IsOwner && !link.IsModerator {
			return nil, fmt.Errorf("alleen de eigenaar of moderator kan deelnemers uitnodigen")
		}
		sessionID = link.SessionID
	} else if req.SessionID != 0 {
		hasAccess, err := deps.SessionService.HasUserAccess(state.User.ID, req.SessionID)
		if err != nil || !hasAccess {
			return nil, fmt.Errorf("geen toegang tot sessie %d", req.SessionID)
		}
		role, err := deps.SessionService.GetUserRole(state.User.ID, req.SessionID)
		if err != nil {
			return nil, fmt.Errorf("sessierol laden mislukt")
		}
		if role != models.RoleOwner && role != models.RoleEditor {
			return nil, fmt.Errorf("alleen de eigenaar of moderator kan deelnemers uitnodigen")
		}
		sessionID = req.SessionID
	} else {
		return nil, fmt.Errorf("geen actieve sessie")
	}

	if req.Role == models.RoleOwner {
		return nil, fmt.Errorf("er is maar één eigenaar per sessie")
	}
	if req.Role != models.RoleEditor && req.Role != models.RoleViewer {
		return nil, fmt.Errorf("ongeldige rol: %q", req.Role)
	}

	session, err := deps.SessionService.GetByIDWithPurpose(sessionID)
	if err != nil {
		return nil, fmt.Errorf("sessie laden mislukt: %w", err)
	}

	if session.Purpose != nil && session.Purpose.Limitations.ID != 0 && !session.Purpose.Limitations.InviteParticipants {
		return nil, fmt.Errorf("deze sessie staat geen uitnodigingen toe")
	}

	invitedUser, err := deps.UserService.GetByEmail(req.Email)
	if err != nil || invitedUser == nil {
		return nil, fmt.Errorf("gebruiker niet gevonden: %s", req.Email)
	}

	hasAccess, err := deps.SessionService.HasUserAccess(invitedUser.ID, sessionID)
	if err != nil {
		return nil, fmt.Errorf("toegang controleren mislukt: %w", err)
	}
	if !hasAccess {
		if err := deps.SessionService.AddUserToSession(invitedUser.ID, sessionID, req.Role); err != nil {
			return nil, fmt.Errorf("gebruiker uitnodigen mislukt: %w", err)
		}
	}

	if session.Status == models.StatusNew || session.Status == models.StatusRecording {
		PublishToUser(
			deps.Node,
			invitedUser.ID,
			SessionInvitedNotification{
				Type:         TypeSessionInvited,
				SessionID:    sessionID,
				InviteCode:   session.InviteCode,
				InviterEmail: state.User.Email,
				Role:         string(req.Role),
			},
			fmt.Sprintf("[USER:%s] session_invited", state.User.Email),
		)
	}

	PublishToUser(
		deps.Node,
		invitedUser.ID,
		NotificationMessage{
			Type:    TypeNotification,
			Level:   NotificationLevelGood,
			Title:   "Je bent uitgenodigd voor een sessie",
			Message: fmt.Sprintf("voor de sessie: %d", session.ID),
			Link:    fmt.Sprintf("/session/%d", session.ID),
		},
		fmt.Sprintf("[USER:%s] session_invited", invitedUser.Email),
	)

	return json.Marshal(SessionInviteResponse{
		Type:      MethodSessionInvite,
		SessionID: sessionID,
		Email:     req.Email,
		Role:      string(req.Role),
	})
}

func HandleSessionInviteDecline(state *ClientState, data []byte, deps *Deps) ([]byte, error) {
	var req SessionInviteDeclineRequest
	if err := json.Unmarshal(data, &req); err != nil {
		return nil, fmt.Errorf("ongeldig verzoek: %w", err)
	}
	if err := validateRequest(&req); err != nil {
		return nil, fmt.Errorf("ongeldig verzoek: %w", err)
	}

	hasAccess, err := deps.SessionService.HasUserAccess(state.User.ID, req.SessionID)
	if err != nil {
		return nil, fmt.Errorf("toegang controleren mislukt: %w", err)
	}
	if !hasAccess {
		return json.Marshal(SessionInviteDeclineResponse{
			Type:      MethodSessionInviteDecline,
			SessionID: req.SessionID,
		})
	}

	role, err := deps.SessionService.GetUserRole(state.User.ID, req.SessionID)
	if err != nil {
		return nil, fmt.Errorf("sessierol laden mislukt")
	}
	if role == models.RoleOwner {
		return nil, fmt.Errorf("eigenaar kan de sessie niet weigeren")
	}
	if err := deps.SessionService.RemoveUserFromSession(state.User.ID, req.SessionID); err != nil {
		return nil, fmt.Errorf("uitnodiging weigeren mislukt")
	}

	publishParticipantsUpdated(deps, req.SessionID)
	PublishActiveSessionsUpdated(deps.Node, []uint{state.User.ID})

	return json.Marshal(SessionInviteDeclineResponse{
		Type:      MethodSessionInviteDecline,
		SessionID: req.SessionID,
	})
}

func HandleSessionJoin(state *ClientState, data []byte, deps *Deps) ([]byte, error) {
	if link := state.GetLink(); link != nil {
		return nil, fmt.Errorf("je zit al in sessie %d, verlaat eerst", link.SessionID)
	}

	var req SessionJoinRequest
	if err := json.Unmarshal(data, &req); err != nil {
		return nil, fmt.Errorf("ongeldig verzoek: %w", err)
	}
	if err := validateRequest(&req); err != nil {
		return nil, fmt.Errorf("ongeldig verzoek: %w", err)
	}

	sessionID := req.SessionID
	var sessionWithPurpose *models.Session
	if sessionID == 0 && req.InviteCode != "" {
		ses, err := deps.SessionService.GetActiveSessionByInviteCode(req.InviteCode)
		if err != nil {
			return nil, fmt.Errorf("uitnodigingscode oplossen mislukt: %w", err)
		}
		if ses == nil {
			return nil, fmt.Errorf("ongeldige of inactieve uitnodigingscode")
		}
		sessionID = ses.ID

		hasAccess, err := deps.SessionService.HasUserAccess(state.User.ID, sessionID)
		if err != nil {
			return nil, fmt.Errorf("toegang controleren mislukt: %w", err)
		}
		if !hasAccess {
			sessionWithPurpose, err = deps.SessionService.GetByIDWithPurpose(sessionID)
			if err != nil {
				return nil, fmt.Errorf("sessie niet gevonden")
			}
			if sessionWithPurpose.Purpose != nil &&
				sessionWithPurpose.Purpose.Limitations.ID != 0 &&
				!sessionWithPurpose.Purpose.Limitations.InviteParticipants {
				return nil, fmt.Errorf("deze sessie staat geen uitnodigingen toe")
			}
			if err := deps.SessionService.AddUserToSession(state.User.ID, sessionID, models.RoleViewer); err != nil {
				return nil, fmt.Errorf("gebruiker aan sessie toevoegen mislukt: %w", err)
			}
		}
	}

	if sessionID == 0 {
		return nil, fmt.Errorf("session_id of invite_code is verplicht")
	}

	hasAccess, err := deps.SessionService.HasUserAccess(state.User.ID, sessionID)
	if err != nil {
		return nil, fmt.Errorf("toegang controleren mislukt: %w", err)
	}
	if !hasAccess {
		return nil, fmt.Errorf("geen toegang tot sessie %d", sessionID)
	}

	role, err := deps.SessionService.GetUserRole(state.User.ID, sessionID)
	if err != nil {
		return nil, fmt.Errorf("sessierol laden mislukt")
	}

	if sessionWithPurpose == nil {
		var err error
		sessionWithPurpose, err = deps.SessionService.GetByIDWithPurpose(sessionID)
		if err != nil {
			return nil, fmt.Errorf("sessie niet gevonden")
		}
	}
	if sessionWithPurpose.Status != models.StatusNew && sessionWithPurpose.Status != models.StatusRecording {
		return nil, fmt.Errorf("sessie %d is niet actief", sessionID)
	}

	state.SetLink(&ParticipantLink{
		SessionID:   sessionID,
		IsOwner:     role == models.RoleOwner,
		IsModerator: role == models.RoleEditor,
	})
	publishParticipantsUpdated(deps, sessionID)

	return json.Marshal(SessionJoinResponse{
		Type:      MethodSessionJoin,
		SessionID: sessionID,
		Role:      string(role),
		Status:    string(sessionWithPurpose.Status),
		Purpose:   buildPurposeInfo(sessionWithPurpose.Purpose),
	})
}

func HandleSessionLeave(state *ClientState, _ []byte, deps *Deps) ([]byte, error) {
	link := state.ClearLink()
	if link == nil {
		return nil, fmt.Errorf("niet in een sessie")
	}
	if link.IsOwner {
		state.SetLink(link) // restore link
		return nil, fmt.Errorf("eigenaar moet recording_stop gebruiken om de sessie te stoppen")
	}

	if err := deps.SessionService.RemoveUserFromSession(state.User.ID, link.SessionID); err != nil {
		state.SetLink(link) // restore link so client can retry
		return nil, fmt.Errorf("sessie verlaten mislukt")
	}

	publishParticipantsUpdated(deps, link.SessionID)
	PublishActiveSessionsUpdated(deps.Node, []uint{state.User.ID})

	return json.Marshal(SessionLeaveResponse{
		Type:      MethodSessionLeave,
		SessionID: link.SessionID,
	})
}
