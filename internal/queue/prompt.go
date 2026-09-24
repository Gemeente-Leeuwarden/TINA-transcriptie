package queue

const MessageTypePromptApplied = "prompt_applied"

type PromptApplyMessage struct {
	Type           RabbitMessageType `json:"type"`
	PromptResultID string            `json:"prompt_result_id"`
	SessionID      string            `json:"session_id"`
	PromptID       string            `json:"prompt_id"`
	PromptTitle    string            `json:"prompt_title,omitempty"`
	PromptContent  string            `json:"prompt_content"`
	Transcription  string            `json:"transcription"`
}

type PromptAppliedMessage struct {
	Type           string `json:"type"`
	PromptResultID string `json:"prompt_result_id"`
	SessionID      string `json:"session_id"`
	PromptID       string `json:"prompt_id"`
	PromptTitle    string `json:"prompt_title,omitempty"`
	Result         string `json:"result"`
	Error          string `json:"error,omitempty"`
	Model          string `json:"model,omitempty"`
}
