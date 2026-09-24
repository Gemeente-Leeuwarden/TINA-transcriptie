package queue

type TranscriptionSegment struct {
	StartMs int64   `json:"start_ms"`
	EndMs   int64   `json:"end_ms"`
	Text    string  `json:"text"`
	Speaker *string `json:"speaker,omitempty"`
}

type TranscriptionPayload struct {
	Type        string `json:"type"`
	SegmentID   string `json:"segment_id,omitempty"`
	SessionID   string `json:"session_id,omitempty"`
	UserID      string `json:"user_id,omitempty"`
	Bucket      string `json:"bucket,omitempty"`
	ObjectName  string `json:"object_name,omitempty"`
	ContentType string `json:"content_type,omitempty"`
	StartedAtMs int64  `json:"started_at_ms,omitempty"`
	EndedAtMs   int64  `json:"ended_at_ms,omitempty"`
}

type TranscriptionMessage struct {
	Type       string                 `json:"type"`
	Transcript string                 `json:"transcript"`
	Summary    string                 `json:"summary,omitempty"`
	Segments   []TranscriptionSegment `json:"segments"`
	Language   string                 `json:"language,omitempty"`
	Model      string                 `json:"model,omitempty"`
	Payload    TranscriptionPayload   `json:"payload"`
}
