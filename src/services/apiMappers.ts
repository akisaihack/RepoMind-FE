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
  history: MessageHistoryDto,
  repositoryId: string,
  session: ConversationSummary,
): Conversation {
  if (history.session_id !== session.id) {
    throw invalidApiData('요청한 세션과 메시지 이력의 ID가 일치하지 않습니다.')
  }

  return {
    ...session,
    repositoryId,
    messages: history.messages.map(mapChatMessageDto),
  }
}
