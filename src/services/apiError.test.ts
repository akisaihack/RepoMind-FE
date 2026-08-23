import { AxiosError } from 'axios'
import { describe, expect, it } from 'vitest'

import {
  RepoMindApiError,
  toRepoMindApiError,
  toUserFacingMessage,
  unwrapApiSuccess,
} from './apiError'

describe('RepoMind API errors', () => {
  it('unwraps a successful backend response from unknown JSON', () => {
    expect(unwrapApiSuccess<{ id: string }>({ success: true, data: { id: 'session-1' } })).toEqual({
      id: 'session-1',
    })
  })

  it('converts a failed backend envelope to a typed error', () => {
    expect(() =>
      unwrapApiSuccess({
        success: false,
        error: { code: 'SESSION_NOT_FOUND', message: 'Session does not exist.' },
      }),
    ).toThrow(RepoMindApiError)
  })

  it('preserves backend API error details', () => {
    const error = new AxiosError('Request failed', 'ERR_BAD_REQUEST')
    error.response = {
      data: {
        success: false,
        error: {
          code: 'REPOSITORY_NOT_READY',
          message: 'Repository analysis is still running.',
          details: { analysis_status: 'indexing' },
        },
      },
      status: 409,
      statusText: 'Conflict',
      headers: {},
      config: error.config!,
    }

    const apiError = toRepoMindApiError(error)

    expect(apiError).toMatchObject({
      code: 'REPOSITORY_NOT_READY',
      status: 409,
      details: { analysis_status: 'indexing' },
    })
    expect(toUserFacingMessage(apiError)).toBe(
      '레포지토리 분석이 완료된 뒤 질문할 수 있습니다.',
    )
  })

  it('converts a network failure to a retryable typed error', () => {
    const apiError = toRepoMindApiError(new AxiosError('Network Error', 'ERR_NETWORK'))

    expect(apiError).toMatchObject({ code: 'NETWORK_ERROR' })
    expect(toUserFacingMessage(apiError)).toBe(
      '서버에 연결하지 못했습니다. 네트워크 상태를 확인해 주세요.',
    )
  })

  it('keeps a created session ID when an ensuing chat request fails', () => {
    const error = new RepoMindApiError({ code: 'REQUEST_FAILED', message: 'Chat failed.' })

    expect(error.withSessionId('session-1').sessionId).toBe('session-1')
  })
})
