import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ConversationSidebar } from '../features/chat/ConversationSidebar'
import { MessageList } from '../features/chat/MessageList'
import { QuestionComposer } from '../features/chat/QuestionComposer'
import { repoMindService } from '../services/mockRepoMindService'
import type {
  ChatMessage,
  Conversation,
  ConversationSummary,
  RepositoryInfo,
} from '../types/api'
import '../styles/workspace.css'

const starterQuestions = [
  '회원 탈퇴 요청은 어디에서 시작돼?',
  '회원 탈퇴가 왜 논리 삭제로 구현되어 있어?',
  'MemberService를 수정하면 어디까지 영향이 있어?',
]

function createOptimisticMessage(question: string): ChatMessage {
  return {
    id: `optimistic-${Date.now()}`,
    role: 'user',
    content: question,
    createdAt: new Date().toISOString(),
  }
}

function extractRepoName(url: string) {
  const parts = url.split('/')
  return parts.length > 0 ? parts[parts.length - 1] : 'Unknown'
}

export function ProjectWorkspacePage() {
  const { projectId, conversationId } = useParams()
  const repositoryId = projectId
  const navigate = useNavigate()
  const [repository, setRepository] = useState<RepositoryInfo>()
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [conversation, setConversation] = useState<Conversation>()
  const [isLoading, setIsLoading] = useState(true)
  const [isResponding, setIsResponding] = useState(false)
  const [error, setError] = useState<string>()

  useEffect(() => {
    let isCurrent = true

    async function loadWorkspace() {
      if (!repositoryId) return

      setIsLoading(true)
      setError(undefined)

      try {
        const [repositoryResult, conversationResults, conversationResult] =
          await Promise.all([
            repoMindService.getRepository(repositoryId),
            repoMindService.getConversations(repositoryId),
            conversationId
              ? repoMindService.getConversation(repositoryId, conversationId)
              : Promise.resolve(undefined),
          ])

        if (!isCurrent) return
        setRepository(repositoryResult)
        setConversations(conversationResults)
        setConversation(conversationResult)

        if (!repositoryResult) {
          setError('존재하지 않는 레포지토리입니다.')
        } else if (conversationId && !conversationResult) {
          setError('대화를 찾을 수 없습니다. 새 대화를 시작해 주세요.')
        }
      } catch {
        if (isCurrent) setError('Workspace를 불러오지 못했습니다.')
      } finally {
        if (isCurrent) setIsLoading(false)
      }
    }

    void loadWorkspace()

    return () => {
      isCurrent = false
    }
  }, [conversationId, repositoryId])

  async function handleQuestion(question: string) {
    if (!repositoryId || !repository || isResponding) return

    const previousConversation = conversation
    const optimisticMessage = createOptimisticMessage(question)
    const optimisticConversation: Conversation = {
      id: conversation?.id ?? 'new-conversation',
      repositoryId,
      title: conversation?.title ?? question,
      updatedAt: optimisticMessage.createdAt,
      messages: [...(conversation?.messages ?? []), optimisticMessage],
    }

    setConversation(optimisticConversation)
    setIsResponding(true)
    setError(undefined)

    try {
      const response = await repoMindService.askQuestion({
        repositoryId,
        conversationId,
        question,
      })

      setConversation(response.conversation)
      const updatedConversations = await repoMindService.getConversations(repositoryId)
      setConversations(updatedConversations)

      if (response.conversation.id !== conversationId) {
        navigate(
          `/projects/${repositoryId}/conversations/${response.conversation.id}`,
          { replace: true },
        )
      }
    } catch {
      setConversation(previousConversation)
      setError('답변을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setIsResponding(false)
    }
  }

  if (isLoading) {
    return (
      <main className="workspace-status">
        <div className="workspace-loader" aria-label="Workspace 불러오는 중" />
        <p>레포지토리 맥락을 불러오고 있습니다.</p>
      </main>
    )
  }

  if (!repository) {
    return (
      <main className="status-page">
        <div className="status-page__card">
          <span className="eyebrow">REPOSITORY NOT FOUND</span>
          <h1>레포지토리를 열 수 없습니다.</h1>
          <p>{error}</p>
          <Link className="primary-button" to="/projects">
            레포지토리 목록으로
          </Link>
        </div>
      </main>
    )
  }

  const repoName = extractRepoName(repository.repository_url)

  return (
    <main className="workspace-page">
      <ConversationSidebar
        repository={repository}
        conversations={conversations}
        activeConversationId={conversationId}
      />

      <section className="chat-workspace">
        <header className="chat-header">
          <div>
            <strong>{repoName}</strong>
            <span>
              {repository.repository_url} · {repository.branch}
            </span>
          </div>
          <span className="analysis-ready">
            <span /> Mock 분석 완료
          </span>
        </header>

        {error && conversationId && (
          <div className="workspace-alert">
            <span>{error}</span>
            <Link to={`/projects/${repository.id}`}>새 대화 시작</Link>
          </div>
        )}

        <div className="chat-scroll-area">
          <MessageList
            messages={conversation?.messages ?? []}
            isResponding={isResponding}
            projectName={repoName}
          />
        </div>

        <QuestionComposer
          disabled={isResponding}
          suggestions={conversation?.messages.length ? [] : starterQuestions}
          onSubmit={handleQuestion}
        />
      </section>
    </main>
  )
}
