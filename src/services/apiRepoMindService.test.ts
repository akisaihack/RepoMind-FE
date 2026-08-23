import { afterEach, describe, expect, it, vi } from 'vitest'

import { apiClient, ApiRepoMindService } from './apiRepoMindService'

const session = {
  session_id: 'session-1',
  repo_id: 'repository-1',
  title: '로그인 흐름',
  created_at: '2026-08-23T10:00:00+00:00',
  updated_at: '2026-08-23T11:00:00+00:00',
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ApiRepoMindService session retrieval', () => {
  it('loads repository conversations from the persisted session API', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: { success: true, data: { sessions: [session] } },
    } as never)

    const conversations = await new ApiRepoMindService().getConversations('repository-1')

    expect(conversations).toEqual([
      {
        id: 'session-1',
        repositoryId: 'repository-1',
        title: '로그인 흐름',
        updatedAt: '2026-08-23T11:00:00+00:00',
      },
    ])
    expect(get).toHaveBeenCalledWith('/sessions/', { params: { repo_id: 'repository-1' } })
  })

  it('loads persisted message history for a session in the requested repository', async () => {
    const get = vi
      .spyOn(apiClient, 'get')
      .mockResolvedValueOnce({ data: { success: true, data: { sessions: [session] } } } as never)
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            session_id: 'session-1',
            messages: [
              {
                message_id: 'message-1',
                role: 'assistant',
                content: '로그인 흐름입니다.',
                structured_answer: {
                  summary: '로그인 흐름입니다.',
                  claims: [],
                  evidence: [],
                  confidence: { level: 'high', reason: '코드에서 확인했습니다.' },
                },
                created_at: '2026-08-23T11:00:00+00:00',
              },
            ],
          },
        },
      } as never)

    const conversation = await new ApiRepoMindService().getConversation(
      'repository-1',
      'session-1',
    )

    expect(conversation).toMatchObject({
      id: 'session-1',
      repositoryId: 'repository-1',
      messages: [
        {
          id: 'message-1',
          role: 'assistant',
          answer: { summary: '로그인 흐름입니다.' },
        },
      ],
    })
    expect(get).toHaveBeenLastCalledWith('/sessions/session-1/messages')
  })

  it('does not request history for a session outside the repository session list', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: { success: true, data: { sessions: [] } },
    } as never)

    await expect(
      new ApiRepoMindService().getConversation('repository-1', 'unknown-session'),
    ).resolves.toBeUndefined()
    expect(get).toHaveBeenCalledTimes(1)
  })

  it('returns no conversations when the repository no longer exists', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: {
        success: false,
        error: { code: 'REPOSITORY_NOT_FOUND', message: 'Repository does not exist.' },
      },
    } as never)

    await expect(new ApiRepoMindService().getConversations('repository-1')).resolves.toEqual([])
  })
})

describe('ApiRepoMindService question submission', () => {
  it('creates a session, sends its first question, and reloads persisted history', async () => {
    const post = vi
      .spyOn(apiClient, 'post')
      .mockResolvedValueOnce({ data: { success: true, data: session } } as never)
      .mockResolvedValueOnce({ data: { success: true, data: { summary: '질문을 처리했습니다.' } } } as never)
    const get = vi
      .spyOn(apiClient, 'get')
      .mockResolvedValueOnce({ data: { success: true, data: { sessions: [session] } } } as never)
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            session_id: 'session-1',
            messages: [
              {
                message_id: 'message-user',
                role: 'user',
                content: '로그인 흐름을 알려줘.',
                structured_answer: null,
                created_at: '2026-08-23T10:00:00+00:00',
              },
              {
                message_id: 'message-assistant',
                role: 'assistant',
                content: '로그인 흐름입니다.',
                structured_answer: {
                  summary: '로그인 흐름입니다.',
                  claims: [],
                  evidence: [],
                  confidence: { level: 'high', reason: '코드에서 확인했습니다.' },
                },
                created_at: '2026-08-23T11:00:00+00:00',
              },
            ],
          },
        },
      } as never)

    const response = await new ApiRepoMindService().askQuestion({
      repositoryId: 'repository-1',
      question: '로그인 흐름을 알려줘.',
    })

    expect(post).toHaveBeenNthCalledWith(1, '/sessions/', {
      repo_id: 'repository-1',
      title: '로그인 흐름을 알려줘.',
    })
    expect(post).toHaveBeenNthCalledWith(2, '/sessions/session-1/chat', {
      question: '로그인 흐름을 알려줘.',
    })
    expect(get).toHaveBeenLastCalledWith('/sessions/session-1/messages')
    expect(response.conversation).toMatchObject({ id: 'session-1' })
    expect(response.conversation.messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'message-user', role: 'user' }),
        expect.objectContaining({ id: 'message-assistant', role: 'assistant' }),
      ]),
    )
    expect(response.assistantMessage).toMatchObject({
      id: 'message-assistant',
      role: 'assistant',
    })
  })

  it('sends a follow-up question to the existing session without creating another one', async () => {
    const post = vi
      .spyOn(apiClient, 'post')
      .mockResolvedValue({ data: { success: true, data: { summary: '질문을 처리했습니다.' } } } as never)
    vi
      .spyOn(apiClient, 'get')
      .mockResolvedValueOnce({ data: { success: true, data: { sessions: [session] } } } as never)
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            session_id: 'session-1',
            messages: [
              {
                message_id: 'message-assistant',
                role: 'assistant',
                content: '후속 답변입니다.',
                structured_answer: {
                  summary: '후속 답변입니다.',
                  claims: [],
                  evidence: [],
                  confidence: { level: 'high', reason: '코드에서 확인했습니다.' },
                },
                created_at: '2026-08-23T11:00:00+00:00',
              },
            ],
          },
        },
      } as never)

    await new ApiRepoMindService().askQuestion({
      repositoryId: 'repository-1',
      conversationId: 'session-1',
      question: '그 다음 흐름은?',
      kind: 'flow',
    })

    expect(post).toHaveBeenCalledTimes(1)
    expect(post).toHaveBeenCalledWith('/sessions/session-1/chat', {
      question: '그 다음 흐름은?',
      question_kind: 'flow',
    })
  })

  it('keeps the created session ID when chat fails after session creation', async () => {
    vi.spyOn(apiClient, 'post')
      .mockResolvedValueOnce({ data: { success: true, data: session } } as never)
      .mockResolvedValueOnce({
        data: {
          success: false,
          error: { code: 'CHAT_FAILED', message: '질문을 처리하지 못했습니다.' },
        },
      } as never)

    await expect(
      new ApiRepoMindService().askQuestion({
        repositoryId: 'repository-1',
        question: '로그인 흐름을 알려줘.',
      }),
    ).rejects.toMatchObject({ code: 'CHAT_FAILED', sessionId: 'session-1' })
  })
})
