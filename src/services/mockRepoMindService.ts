import { createMockAnswer } from '../mocks/answers'
import { mockRepositories } from '../mocks/repositories'
import type {
  AskQuestionRequest,
  AskQuestionResponse,
  ChatMessage,
  Conversation,
  ConversationSummary,
  RepositoryInfo,
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

export class MockRepoMindService implements RepoMindService {
  async createRepository(repository_url: string, branch: string): Promise<RepositoryInfo> {
    await wait(400)
    const newRepo: RepositoryInfo = {
      id: createId('repo'),
      repository_url,
      branch,
      latest_analyzed_sha: null,
      analysis_status: 'pending',
    }
    mockRepositories.unshift(newRepo)
    return copy(newRepo)
  }

  async getRepositories(): Promise<RepositoryInfo[]> {
    await wait(250)
    return copy(mockRepositories)
  }

  async getRepository(repositoryId: string): Promise<RepositoryInfo | undefined> {
    await wait(180)
    const repository = mockRepositories.find((candidate) => candidate.id === repositoryId)
    return repository ? copy(repository) : undefined
  }

  async getConversations(repositoryId: string): Promise<ConversationSummary[]> {
    await wait(160)

    return getStoredConversations()
      .filter((conversation) => conversation.repositoryId === repositoryId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map(({ id, repositoryId, title, updatedAt }) => ({ id, repositoryId, title, updatedAt }))
  }

  async getConversation(
    repositoryId: string,
    conversationId: string,
  ): Promise<Conversation | undefined> {
    await wait(220)
    const conversation = getStoredConversations().find(
      (candidate) =>
        candidate.repositoryId === repositoryId && candidate.id === conversationId,
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
            candidate.repositoryId === request.repositoryId &&
            candidate.id === request.conversationId,
        )
      : undefined

    if (!conversation) {
      conversation = {
        id: createId('conversation'),
        repositoryId: request.repositoryId,
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
