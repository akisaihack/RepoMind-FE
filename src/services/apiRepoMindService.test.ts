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
