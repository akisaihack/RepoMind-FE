import { describe, expect, it } from 'vitest'

import { RepoMindApiError } from './apiError'
import {
  mapChatMessageDto,
  mapMessageHistoryDto,
  mapSessionDto,
  mapSessionListDto,
} from './apiMappers'

const sessionDto = {
  session_id: 'session-1',
  repo_id: 'repository-1',
  title: '로그인 흐름',
  created_at: '2026-08-23T10:00:00+00:00',
  updated_at: '2026-08-23T11:00:00+00:00',
}

const structuredAnswer = {
  summary: '로그인 흐름입니다.',
  claims: [],
  evidence: [],
  confidence: { level: 'high' as const, reason: '코드에서 확인했습니다.' },
}

describe('API response mappers', () => {
  it('maps a backend session to a frontend conversation summary', () => {
    expect(mapSessionDto(sessionDto)).toEqual({
      id: 'session-1',
      repositoryId: 'repository-1',
      title: '로그인 흐름',
      updatedAt: '2026-08-23T11:00:00+00:00',
    })
  })

  it('rejects a malformed session list before it reaches the UI', () => {
    expect(() => mapSessionListDto({ sessions: [{ session_id: 'session-1' }] })).toThrow(
      RepoMindApiError,
    )
  })

  it('maps stored structured answers to assistant messages', () => {
    expect(
      mapChatMessageDto({
        message_id: 'message-1',
        role: 'assistant',
        content: '로그인 흐름입니다.',
        structured_answer: structuredAnswer,
        created_at: '2026-08-23T11:00:00+00:00',
      }),
    ).toEqual({
      id: 'message-1',
      role: 'assistant',
      content: '로그인 흐름입니다.',
      answer: structuredAnswer,
      createdAt: '2026-08-23T11:00:00+00:00',
    })
  })

  it('rejects an invalid structured answer instead of rendering malformed data', () => {
    expect(() =>
      mapChatMessageDto({
        message_id: 'message-1',
        role: 'assistant',
        content: '잘못된 답변',
        structured_answer: { summary: 'claims and confidence are missing' },
        created_at: '2026-08-23T11:00:00+00:00',
      }),
    ).toThrow(RepoMindApiError)
  })

  it('maps a message history only when it belongs to the requested session', () => {
    const session = mapSessionDto(sessionDto)

    expect(
      mapMessageHistoryDto(
        {
          session_id: 'session-1',
          messages: [
            {
              message_id: 'message-1',
              role: 'user',
              content: '로그인 흐름을 알려줘.',
              structured_answer: null,
              created_at: '2026-08-23T10:00:00+00:00',
            },
          ],
        },
        'repository-1',
        session,
      ),
    ).toMatchObject({
      id: 'session-1',
      repositoryId: 'repository-1',
      messages: [{ id: 'message-1', role: 'user' }],
    })
  })
})
