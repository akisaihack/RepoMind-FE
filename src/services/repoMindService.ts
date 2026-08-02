import type {
  AskQuestionRequest,
  AskQuestionResponse,
  Conversation,
  ConversationSummary,
  ProjectSummary,
} from '../types/api'

export interface RepoMindService {
  getProjects(): Promise<ProjectSummary[]>
  getProject(projectId: string): Promise<ProjectSummary | undefined>
  getConversations(projectId: string): Promise<ConversationSummary[]>
  getConversation(
    projectId: string,
    conversationId: string,
  ): Promise<Conversation | undefined>
  askQuestion(request: AskQuestionRequest): Promise<AskQuestionResponse>
}
