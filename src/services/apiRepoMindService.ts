import axios from 'axios'
import type {
  AskQuestionRequest,
  AskQuestionResponse,
  Conversation,
  ConversationSummary,
  RepositoryInfo,
} from '../types/api'
import type { RepoMindService } from './repoMindService'

const API_BASE_URL = 'http://localhost:8000/api/v1'

const apiClient = axios.create({
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
    } catch (error: any) {
      if (error.response?.status === 404) {
        return undefined
      }
      throw error
    }
  }

  async getConversations(repositoryId: string): Promise<ConversationSummary[]> {
    // 백엔드에 대화 기록 API가 아직 없으므로 빈 배열 반환 또는 추후 연동
    return []
  }

  async getConversation(
    repositoryId: string,
    conversationId: string,
  ): Promise<Conversation | undefined> {
    // 백엔드 API 연동 전이므로 undefined 반환
    return undefined
  }

  async askQuestion(request: AskQuestionRequest): Promise<AskQuestionResponse> {
    // 백엔드 질문 API 연동
    throw new Error('Not implemented yet')
  }
}
