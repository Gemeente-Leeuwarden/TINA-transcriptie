package queue

type RabbitMessageType string

const (
	MessageTypeRecordingReady RabbitMessageType = "recording_ready"
	MessageTypeUploadReady    RabbitMessageType = "upload_ready"
	MessageTypeUploadFinalize RabbitMessageType = "upload_finalize"
	MessageTypeSegmentReady   RabbitMessageType = "segment_ready"
	MessageTypePromptApply    RabbitMessageType = "prompt_apply"
)

type SegmentInfo struct {
	UserID      string `json:"user_id"`
	ObjectName  string `json:"object_name"`
	ContentType string `json:"content_type,omitempty"`
	StartedAtMs int64  `json:"started_at_ms"`
	EndedAtMs   int64  `json:"ended_at_ms"`
}

type PurposeLimitations struct {
	InviteParticipants bool `json:"invite_participants"`
	AllowAppRecording  bool `json:"allow_app_recording"`
}

type PurposeRetention struct {
	AudioHours         uint `json:"audio_hours"`
	TranscriptionHours uint `json:"transcription_hours"`
	PromptsHours       uint `json:"prompts_hours"`
}

type PurposeInfo struct {
	ID          uint                `json:"id"`
	Title       string              `json:"title"`
	Description string              `json:"description"`
	PromptID    uint                `json:"prompt_id"`
	Limitations *PurposeLimitations `json:"limitations,omitempty"`
	Retention   *PurposeRetention   `json:"retention,omitempty"`
}

type PromptInfo struct {
	ID      uint   `json:"id"`
	Title   string `json:"title"`
	Content string `json:"content"`
}

type MessageRecordingReady struct {
	Type      RabbitMessageType `json:"type"`
	SessionID string            `json:"session_id"`
	Bucket    string            `json:"bucket"`
	Segments  []SegmentInfo     `json:"segments"`
	Purpose   *PurposeInfo      `json:"purpose,omitempty"`
	Prompt    *PromptInfo       `json:"prompt,omitempty"`
}

type MessageUploadReady struct {
	Type        RabbitMessageType `json:"type"`
	SessionID   string            `json:"session_id"`
	ObjectName  string            `json:"object_name"`
	FileName    string            `json:"file_name"`
	ContentType string            `json:"content_type,omitempty"`
	Purpose     *PurposeInfo      `json:"purpose,omitempty"`
	Prompt      *PromptInfo       `json:"prompt,omitempty"`
}

type MessageUploadFinalize struct {
	Type      RabbitMessageType `json:"type"`
	SessionID string            `json:"session_id"`
	Bucket    string            `json:"bucket"`
	Segments  []SegmentInfo     `json:"segments"`
	Purpose   *PurposeInfo      `json:"purpose,omitempty"`
	Prompt    *PromptInfo       `json:"prompt,omitempty"`
}

type MessageSegmentReady struct {
	Type        RabbitMessageType `json:"type"`
	SegmentID   string            `json:"segment_id"`
	SessionID   string            `json:"session_id"`
	UserID      string            `json:"user_id"`
	Bucket      string            `json:"bucket"`
	ObjectName  string            `json:"object_name"`
	ContentType string            `json:"content_type,omitempty"`
	StartedAtMs int64             `json:"started_at_ms"`
	EndedAtMs   int64             `json:"ended_at_ms"`
	Purpose     *PurposeInfo      `json:"purpose,omitempty"`
	Prompt      *PromptInfo       `json:"prompt,omitempty"`
}
