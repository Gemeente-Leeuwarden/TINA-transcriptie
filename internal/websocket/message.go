package websocket

import "platform/internal/database/models"

// RPC call (methods) from client to server
const (
	MethodRecordingStart       = "recording_start"
	MethodRecordingStop        = "recording_stop"
	MethodRecordingBegin       = "recording_begin"
	MethodSessionInvite        = "session_invite"
	MethodSessionInviteDecline = "session_invite_decline"
	MethodSessionJoin          = "session_join"
	MethodSessionLeave         = "session_leave"
)

type MessageType string

type NotificationLevel string

// Response types
const (
	TypeError                                   = "error"
	TypeSessionStarted                          = "session_started"
	TypeSessionEnded                            = "session_ended"
	TypeSessionInvited                          = "session_invited"
	TypeParticipantsUpdated                     = "participants_updated"
	TypeUploadCompleted                         = "upload_completed"
	TypeUploadFailed                            = "upload_failed"
	TypeSegmentSummary                          = "segment_summary"
	TypeActiveSessionsUpdated                   = "active_sessions_updated"
	TypeNotifyUserRemoval                       = "notify_user_removal_of_session"
	TypeNotification                            = "notification"
	NotificationLevelGood     NotificationLevel = "good"
	NotificationLevelWarning  NotificationLevel = "warning"
	NotificationLevelBad      NotificationLevel = "bad"
)

// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// =-=-=-=-=-=-=-=- RESPONSE =-=-=-=-=-=-=-=-
// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=	-=-=-

type ErrorResponse struct {
	Type    string         `json:"type"`
	Message string         `json:"message"`
	Data    map[string]any `json:"data,omitempty"`
}
type RecordingStartedResponse struct {
	Type       string       `json:"type"`
	SessionID  string       `json:"session_id"`
	InviteCode string       `json:"invite_code"`
	Purpose    *PurposeInfo `json:"purpose,omitempty"`
}
type RecordingStoppedResponse struct {
	Type         string `json:"type"`
	SessionID    uint   `json:"session_id"`
	TotalChunks  int    `json:"total_chunks"`
	TotalAudioMs int64  `json:"total_audio_ms"`
}
type RecordingStartRequest struct {
	PurposeID uint `json:"purpose_id" validate:"required,gt=0"`
}
type RecordingBeginRequest struct {
	SessionID uint `json:"session_id" validate:"required,gt=0"`
}
type PartialTranscriptResponse struct {
	Type        string  `json:"type"`
	SessionID   uint    `json:"session_id"`
	Text        string  `json:"text"`
	IsFinal     bool    `json:"is_final"`
	Confidence  float64 `json:"confidence,omitempty"`
	StartTimeMs int64   `json:"start_time_ms,omitempty"`
	EndTimeMs   int64   `json:"end_time_ms,omitempty"`
}

// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// =-=-=-=-= SESSION COLLABORATION =-=-=-=-=-
// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

// When an owner invites a person
type SessionInviteRequest struct {
	Email     string                 `json:"email" validate:"required,email"`
	Role      models.UserSessionRole `json:"role"`
	SessionID uint                   `json:"session_id,omitempty" validate:"omitempty,gt=0"`
}

type SessionInviteDeclineRequest struct {
	SessionID uint `json:"session_id" validate:"required,gt=0"`
}

// When a person joins by invite code
type SessionJoinRequest struct {
	SessionID  uint   `json:"session_id,omitempty" validate:"omitempty,gt=0"`
	InviteCode string `json:"invite_code,omitempty"`
}
type SessionInviteResponse struct {
	Type      string `json:"type"`
	SessionID uint   `json:"session_id"`
	Email     string `json:"email"`
	Role      string `json:"role"`
}

type SessionInviteDeclineResponse struct {
	Type      string `json:"type"`
	SessionID uint   `json:"session_id"`
}
type SessionJoinResponse struct {
	Type      string       `json:"type"`
	SessionID uint         `json:"session_id"`
	Role      string       `json:"role"`
	Status    string       `json:"status"`
	Purpose   *PurposeInfo `json:"purpose,omitempty"`
}
type SessionLeaveResponse struct {
	Type      string `json:"type"`
	SessionID uint   `json:"session_id"`
}
type SessionEndedNotification struct {
	Type      string `json:"type"`
	SessionID uint   `json:"session_id"`
}
type SessionStartedNotification struct {
	Type      string `json:"type"`
	SessionID uint   `json:"session_id"`
	Status    string `json:"status"`
}
type SessionInvitedNotification struct {
	Type         string `json:"type"`
	SessionID    uint   `json:"session_id"`
	InviteCode   string `json:"invite_code"`
	InviterEmail string `json:"inviter_email"`
	Role         string `json:"role"`
}
type ParticipantsUpdatedNotification struct {
	Type         string            `json:"type"`
	SessionID    uint              `json:"session_id"`
	Participants []ParticipantInfo `json:"participants"`
}
type UploadCompletedNotification struct {
	Type          string `json:"type"`
	SessionID     uint   `json:"session_id"`
	Transcription string `json:"transcription"`
}
type UploadFailedNotification struct {
	Type      string `json:"type"`
	SessionID uint   `json:"session_id"`
	Error     string `json:"error"`
}
type SegmentSummaryNotification struct {
	Type        string `json:"type"`
	SessionID   uint   `json:"session_id"`
	SegmentID   uint   `json:"segment_id"`
	UserID      uint   `json:"user_id"`
	Sequence    int    `json:"sequence"`
	Transcript  string `json:"transcript"`
	Summary     string `json:"summary"`
	StartedAtMs int64  `json:"started_at_ms"`
	EndedAtMs   int64  `json:"ended_at_ms"`
}
type ActiveSessionsUpdatedNotification struct {
	Type string `json:"type"`
}
type NotifyUserRemovalOfSessionMessage struct {
	Type      string `json:"type"`
	SessionID uint   `json:"session_id"`
}
type NotificationMessage struct {
	Type    MessageType       `json:"type"`
	Level   NotificationLevel `json:"level,omitempty"`
	Title   string            `json:"title,omitempty"`
	Message string            `json:"message,omitempty"`
	Link    string            `json:"link,omitempty"`
	ID      string            `json:"id,omitempty"`
}

type PurposeLimitationsInfo struct {
	InviteParticipants bool `json:"invite_participants"`
	AllowAppRecording  bool `json:"allow_app_recording"`
}

type PurposeRetentionInfo struct {
	AudioHours         uint `json:"audio_hours"`
	TranscriptionHours uint `json:"transcription_hours"`
	PromptsHours       uint `json:"prompts_hours"`
}

type PurposePromptInfo struct {
	ID    uint   `json:"id"`
	Title string `json:"title"`
}

type PurposeInfo struct {
	ID          uint                    `json:"id"`
	Title       string                  `json:"title"`
	Description string                  `json:"description"`
	PromptID    uint                    `json:"prompt_id"`
	Prompt      *PurposePromptInfo      `json:"prompt,omitempty"`
	Limitations *PurposeLimitationsInfo `json:"limitations,omitempty"`
	Retention   *PurposeRetentionInfo   `json:"retention,omitempty"`
}
