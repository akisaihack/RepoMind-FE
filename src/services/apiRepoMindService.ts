import axios from 'axios'
import type {
  AskQuestionRequest,
  AskQuestionResponse,
  Conversation,
  ConversationSummary,
  RepositoryInfo,
} from '../types/api'
import { RepoMindApiError, toRepoMindApiError, unwrapApiSuccess } from './apiError'
import type { ChatRequestDto, MessageHistoryDto, SessionDto, SessionListDto } from './apiDtos'
import { mapMessageHistoryDto, mapSessionListDto, mapSessionResponseDto } from './apiMappers'
import type { RepoMindService } from './repoMindService'

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

function createConversationTitle(question: string): string {
  const normalized = question.replace(/\s+/g, ' ').trim()
  return normalized.length > 30 ? `${normalized.slice(0, 30)}…` : normalized
}

export class ApiRepoMindService implements RepoMindService {
  async createRepository(repository_url: string, branch: string): Promise<RepositoryInfo> {
    const response = await apiClient.post('/repositories/', {
      repository_url,
      branch,
    })
    return response.data.data
  }

  async getRepositories(): Promise<RepositoryInfo[]> {
    const response = await apiClient.get('/repositories/')
    return response.data.data.repositories
  }

  async getRepository(repositoryId: string): Promise<RepositoryInfo | undefined> {
    try {
      const response = await apiClient.get(`/repositories/${repositoryId}`)
      return response.data.data
    } catch (error: unknown) {
      const apiError = toRepoMindApiError(error)
      if (apiError.code === 'REPOSITORY_NOT_FOUND' || apiError.status === 404) {
        return undefined
      }
      throw apiError
    }
  }

  async getConversations(repositoryId: string): Promise<ConversationSummary[]> {
    try {
      const response = await apiClient.get<unknown>('/sessions/', {
        params: { repo_id: repositoryId },
      })
      return mapSessionListDto(unwrapApiSuccess<SessionListDto>(response.data))
    } catch (error: unknown) {
      const apiError = toRepoMindApiError(error)
      if (apiError.code === 'REPOSITORY_NOT_FOUND') return []
      throw apiError
    }
  }

  async getConversation(
    repositoryId: string,
    conversationId: string,
  ): Promise<Conversation | undefined> {
    const session = (await this.getConversations(repositoryId)).find(
      (candidate) => candidate.id === conversationId && candidate.repositoryId === repositoryId,
    )
    if (!session) return undefined

    try {
      const response = await apiClient.get<unknown>(`/sessions/${conversationId}/messages`)
      return mapMessageHistoryDto(
        unwrapApiSuccess<MessageHistoryDto>(response.data),
        repositoryId,
        session,
      )
    } catch (error: unknown) {
      const apiError = toRepoMindApiError(error)
      if (apiError.code === 'SESSION_NOT_FOUND') return undefined
      throw apiError
    }
  }

  async askQuestion(request: AskQuestionRequest): Promise<AskQuestionResponse> {
    let sessionId = request.conversationId
    let createdSessionId: string | undefined

    try {
      if (!sessionId) {
        const response = await apiClient.post<unknown>('/sessions/', {
          repo_id: request.repositoryId,
          title: createConversationTitle(request.question),
        })
        const createdSession = mapSessionResponseDto(
          unwrapApiSuccess<SessionDto>(response.data),
        )
        if (createdSession.repositoryId !== request.repositoryId) {
          throw new RepoMindApiError({
            code: 'INVALID_API_RESPONSE',
            message: '생성된 세션의 레포지토리 정보가 일치하지 않습니다.',
          })
        }
        sessionId = createdSession.id
        createdSessionId = sessionId
      }

      const chatRequest: ChatRequestDto = {
        question: request.question,
        ...(request.kind ? { question_kind: request.kind } : {}),
      }
      const chatResponse = await apiClient.post<unknown>(`/sessions/${sessionId}/chat`, chatRequest)
      unwrapApiSuccess<unknown>(chatResponse.data)

      const conversation = await this.getConversation(request.repositoryId, sessionId)
      if (!conversation) {
        throw new RepoMindApiError({
          code: 'CONVERSATION_SYNC_FAILED',
          message: '질문 후 대화 이력을 불러오지 못했습니다.',
          sessionId,
        })
      }
      const assistantMessage = [...conversation.messages]
        .reverse()
        .find((message) => message.role === 'assistant')
      if (!assistantMessage) {
        throw new RepoMindApiError({
          code: 'CONVERSATION_SYNC_FAILED',
          message: '질문 후 assistant 답변을 찾을 수 없습니다.',
          sessionId,
        })
      }

      return { conversation, assistantMessage }
    } catch (error: unknown) {
      const apiError = toRepoMindApiError(error)
      throw createdSessionId ? apiError.withSessionId(createdSessionId) : apiError
    }
  }

  async deleteRepository(repositoryId: string): Promise<void> {
    await apiClient.delete(`/repositories/${repositoryId}`)
  }

  async retryAnalysis(repositoryId: string): Promise<void> {
    await apiClient.post(`/repositories/${repositoryId}/retry`)
  }
}
