/** Backend API response contracts, kept separate from frontend domain types. */

export interface ApiSuccessEnvelope<T> {
  success: true
  data: T
}

export interface ApiFailureEnvelope {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiFailureEnvelope

export interface SessionDto {
  session_id: string
  repo_id: string
  title: string
  created_at: string
  updated_at: string
}

export interface SessionListDto {
  sessions: SessionDto[]
}

export interface ChatMessageDto {
  message_id: string
  role: 'user' | 'assistant'
  content: string
  structured_answer: unknown | null
  created_at: string
}

export interface MessageHistoryDto {
  session_id: string
  messages: ChatMessageDto[]
}

export interface ChatRequestDto {
  question: string
  question_kind?: string
}
