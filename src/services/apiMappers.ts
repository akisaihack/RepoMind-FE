import { RepoMindApiError } from './apiError'
import type { ChatMessageDto, MessageHistoryDto, SessionDto } from './apiDtos'
import type { ChatMessage, Conversation, ConversationSummary, StructuredAnswer } from '../types/api'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isStructuredAnswer(value: unknown): value is StructuredAnswer {
  return (
    isRecord(value) &&
    typeof value.summary === 'string' &&
    Array.isArray(value.claims) &&
    Array.isArray(value.evidence) &&
    isRecord(value.confidence) &&
    typeof value.confidence.level === 'string' &&
    typeof value.confidence.reason === 'string'
  )
}

function invalidApiData(message: string): RepoMindApiError {
  return new RepoMindApiError({ code: 'INVALID_API_RESPONSE', message })
}

function requireString(value: Record<string, unknown>, key: string): string {
  const field = value[key]
  if (typeof field !== 'string') {
    throw invalidApiData(`응답의 ${key} 필드가 올바르지 않습니다.`)
  }
  return field
}

function parseSessionDto(value: unknown): SessionDto {
  if (!isRecord(value)) {
    throw invalidApiData('세션 응답 형식이 올바르지 않습니다.')
  }

  return {
    session_id: requireString(value, 'session_id'),
    repo_id: requireString(value, 'repo_id'),
    title: requireString(value, 'title'),
    created_at: requireString(value, 'created_at'),
    updated_at: requireString(value, 'updated_at'),
  }
}

function parseChatMessageDto(value: unknown): ChatMessageDto {
  if (!isRecord(value)) {
    throw invalidApiData('메시지 응답 형식이 올바르지 않습니다.')
  }

  const role = requireString(value, 'role')
  if (role !== 'user' && role !== 'assistant') {
    throw invalidApiData('지원하지 않는 메시지 역할입니다.')
  }

  const structuredAnswer = value.structured_answer
  if (structuredAnswer !== null && structuredAnswer !== undefined && !isStructuredAnswer(structuredAnswer)) {
    throw invalidApiData('구조화된 답변 형식이 올바르지 않습니다.')
  }

  return {
    message_id: requireString(value, 'message_id'),
    role,
    content: requireString(value, 'content'),
    structured_answer: structuredAnswer ?? null,
    created_at: requireString(value, 'created_at'),
  }
}

export function mapSessionDto(session: SessionDto): ConversationSummary {
  if (!session.session_id || !session.repo_id || !session.title || !session.updated_at) {
    throw invalidApiData('세션 응답 형식이 올바르지 않습니다.')
  }

  return {
    id: session.session_id,
    repositoryId: session.repo_id,
    title: session.title,
    updatedAt: session.updated_at,
  }
}

export function mapSessionListDto(value: unknown): ConversationSummary[] {
  if (!isRecord(value) || !Array.isArray(value.sessions)) {
    throw invalidApiData('세션 목록 응답 형식이 올바르지 않습니다.')
  }

  return value.sessions.map((session) => mapSessionDto(parseSessionDto(session)))
}

export function mapChatMessageDto(message: ChatMessageDto): ChatMessage {
  if (!message.message_id || !message.content || !message.created_at) {
    throw invalidApiData('메시지 응답 형식이 올바르지 않습니다.')
  }
  if (message.role !== 'user' && message.role !== 'assistant') {
    throw invalidApiData('지원하지 않는 메시지 역할입니다.')
  }
  if (message.structured_answer !== null && !isStructuredAnswer(message.structured_answer)) {
    throw invalidApiData('구조화된 답변 형식이 올바르지 않습니다.')
  }

  return {
    id: message.message_id,
    role: message.role,
    content: message.content,
    createdAt: message.created_at,
    ...(message.structured_answer === null ? {} : { answer: message.structured_answer }),
  }
}

export function mapMessageHistoryDto(
  value: unknown,
  repositoryId: string,
  session: ConversationSummary,
): Conversation {
  if (!isRecord(value) || !Array.isArray(value.messages)) {
    throw invalidApiData('메시지 이력 응답 형식이 올바르지 않습니다.')
  }

  const history: MessageHistoryDto = {
    session_id: requireString(value, 'session_id'),
    messages: value.messages.map(parseChatMessageDto),
  }
  if (history.session_id !== session.id) {
    throw invalidApiData('요청한 세션과 메시지 이력의 ID가 일치하지 않습니다.')
  }

  return {
    ...session,
    repositoryId,
    messages: history.messages.map(mapChatMessageDto),
  }
}
