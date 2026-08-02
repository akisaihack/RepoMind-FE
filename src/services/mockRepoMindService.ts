import { createMockAnswer } from '../mocks/answers'
import { mockProjects } from '../mocks/projects'
import type {
  AskQuestionRequest,
  AskQuestionResponse,
  ChatMessage,
  Conversation,
  ConversationSummary,
  ProjectSummary,
} from '../types/api'
import type { RepoMindService } from './repoMindService'

const STORAGE_KEY = 'repomind.mock.conversations.v1'

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, milliseconds)
  })
}

function copy<T>(value: T): T {
  return structuredClone(value)
}

function createId(prefix: string) {
  const randomPart =
    typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `${prefix}-${randomPart}`
}

function getStoredConversations(): Conversation[] {
  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY)
    const parsedValue: unknown = storedValue ? JSON.parse(storedValue) : []
    return Array.isArray(parsedValue) ? (parsedValue as Conversation[]) : []
  } catch {
    return []
  }
}

function saveConversations(conversations: Conversation[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations))
  } catch {
    // Mock 저장이 막혀도 현재 세션의 질문·답변 흐름은 계속 동작해야 합니다.
  }
}

function createConversationTitle(question: string) {
  const normalized = question.replace(/\s+/g, ' ').trim()
  return normalized.length > 30 ? `${normalized.slice(0, 30)}…` : normalized
}

class MockRepoMindService implements RepoMindService {
  async getProjects(): Promise<ProjectSummary[]> {
    await wait(250)
    return copy(mockProjects)
  }

  async getProject(projectId: string): Promise<ProjectSummary | undefined> {
    await wait(180)
    const project = mockProjects.find((candidate) => candidate.id === projectId)
    return project ? copy(project) : undefined
  }

  async getConversations(projectId: string): Promise<ConversationSummary[]> {
    await wait(160)

    return getStoredConversations()
      .filter((conversation) => conversation.projectId === projectId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map(({ id, title, updatedAt }) => ({ id, projectId, title, updatedAt }))
  }

  async getConversation(
    projectId: string,
    conversationId: string,
  ): Promise<Conversation | undefined> {
    await wait(220)
    const conversation = getStoredConversations().find(
      (candidate) =>
        candidate.projectId === projectId && candidate.id === conversationId,
    )
    return conversation ? copy(conversation) : undefined
  }

  async askQuestion(request: AskQuestionRequest): Promise<AskQuestionResponse> {
    await wait(850)

    const conversations = getStoredConversations()
    const now = new Date().toISOString()
    let conversation = request.conversationId
      ? conversations.find(
          (candidate) =>
            candidate.projectId === request.projectId &&
            candidate.id === request.conversationId,
        )
      : undefined

    if (!conversation) {
      conversation = {
        id: createId('conversation'),
        projectId: request.projectId,
        title: createConversationTitle(request.question),
        updatedAt: now,
        messages: [],
      }
      conversations.push(conversation)
    }

    const userMessage: ChatMessage = {
      id: createId('message'),
      role: 'user',
      content: request.question.trim(),
      createdAt: now,
    }
    const answer = createMockAnswer(request.question, request.kind)
    const assistantMessage: ChatMessage = {
      id: createId('message'),
      role: 'assistant',
      content: answer.summary,
      createdAt: new Date().toISOString(),
      answer,
    }

    conversation.messages.push(userMessage, assistantMessage)
    conversation.updatedAt = assistantMessage.createdAt
    saveConversations(conversations)

    return {
      conversation: copy(conversation),
      assistantMessage: copy(assistantMessage),
    }
  }
}

export const repoMindService: RepoMindService = new MockRepoMindService()
