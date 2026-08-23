import axios from 'axios'
import type {
  AskQuestionRequest,
  AskQuestionResponse,
  Conversation,
  ConversationSummary,
  RepositoryInfo,
} from '../types/api'
import { toRepoMindApiError, unwrapApiSuccess } from './apiError'
import type { MessageHistoryDto, SessionListDto } from './apiDtos'
import { mapMessageHistoryDto, mapSessionListDto } from './apiMappers'
import type { RepoMindService } from './repoMindService'

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

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
    // 백엔드 질문 API 연동
    void request
    throw new Error('Not implemented yet')
  }

  async deleteRepository(repositoryId: string): Promise<void> {
    await apiClient.delete(`/repositories/${repositoryId}`)
  }

  async retryAnalysis(repositoryId: string): Promise<void> {
    await apiClient.post(`/repositories/${repositoryId}/retry`)
  }
}
