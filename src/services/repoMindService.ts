import type {
  AskQuestionRequest,
  AskQuestionResponse,
  Conversation,
  ConversationSummary,
  RepositoryInfo,
} from '../types/api'

export interface RepoMindService {
  createRepository(repository_url: string, branch: string): Promise<RepositoryInfo>
  getRepositories(): Promise<RepositoryInfo[]>
  getRepository(repositoryId: string): Promise<RepositoryInfo | undefined>
  getConversations(repositoryId: string): Promise<ConversationSummary[]>
  getConversation(
    repositoryId: string,
    conversationId: string,
  ): Promise<Conversation | undefined>
  askQuestion(request: AskQuestionRequest): Promise<AskQuestionResponse>
  deleteRepository(repositoryId: string): Promise<void>
  retryAnalysis(repositoryId: string): Promise<void>
}
