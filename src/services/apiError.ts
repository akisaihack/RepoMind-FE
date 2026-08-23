import axios from 'axios'

import type { ApiFailureEnvelope } from './apiDtos'

export class RepoMindApiError extends Error {
  readonly status?: number
  readonly code: string
  readonly details?: unknown
  readonly sessionId?: string

  constructor({
    message,
    code,
    status,
    details,
    sessionId,
  }: {
    message: string
    code: string
    status?: number
    details?: unknown
    sessionId?: string
  }) {
    super(message)
    this.name = 'RepoMindApiError'
    this.code = code
    this.status = status
    this.details = details
    this.sessionId = sessionId
  }

  withSessionId(sessionId: string): RepoMindApiError {
    return new RepoMindApiError({
      message: this.message,
      code: this.code,
      status: this.status,
      details: this.details,
      sessionId,
    })
  }
}

function isFailureEnvelope(value: unknown): value is ApiFailureEnvelope {
  if (!isRecord(value) || value.success !== false || !isRecord(value.error)) return false

  return typeof value.error.code === 'string' && typeof value.error.message === 'string'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function unwrapApiSuccess<T>(value: unknown): T {
  if (isRecord(value) && value.success === true && 'data' in value) {
    return value.data as T
  }
  if (isFailureEnvelope(value)) {
    throw new RepoMindApiError({
      message: value.error.message,
      code: value.error.code,
      details: value.error.details,
    })
  }

  throw new RepoMindApiError({
    message: '서버 응답 형식이 올바르지 않습니다.',
    code: 'INVALID_API_RESPONSE',
  })
}

export function toRepoMindApiError(error: unknown): RepoMindApiError {
  if (error instanceof RepoMindApiError) return error

  if (axios.isAxiosError(error)) {
    const payload = error.response?.data
    if (isFailureEnvelope(payload)) {
      return new RepoMindApiError({
        message: payload.error.message,
        code: payload.error.code,
        status: error.response?.status,
        details: payload.error.details,
      })
    }

    return new RepoMindApiError({
      message: '서버와 통신하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      code: error.code === 'ERR_NETWORK' ? 'NETWORK_ERROR' : 'REQUEST_FAILED',
      status: error.response?.status,
    })
  }

  return new RepoMindApiError({
    message: '예상하지 못한 오류가 발생했습니다.',
    code: 'UNKNOWN_ERROR',
  })
}

export function toUserFacingMessage(error: RepoMindApiError): string {
  switch (error.code) {
    case 'REPOSITORY_NOT_READY':
      return '레포지토리 분석이 완료된 뒤 질문할 수 있습니다.'
    case 'REPOSITORY_NOT_FOUND':
      return '존재하지 않는 레포지토리입니다.'
    case 'SESSION_NOT_FOUND':
      return '대화를 찾을 수 없습니다. 새 대화를 시작해 주세요.'
    case 'NETWORK_ERROR':
      return '서버에 연결하지 못했습니다. 네트워크 상태를 확인해 주세요.'
    default:
      return error.message
  }
}
