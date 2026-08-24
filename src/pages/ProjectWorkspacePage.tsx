import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ConversationSidebar } from '../features/chat/ConversationSidebar'
import { MessageList } from '../features/chat/MessageList'
import { QuestionComposer } from '../features/chat/QuestionComposer'
import { repoMindService } from '../services'
import { toRepoMindApiError, toUserFacingMessage } from '../services/apiError'
import type {
  ChatMessage,
  Conversation,
  ConversationSummary,
  RepositoryInfo,
} from '../types/api'
import '../styles/workspace.css'

const analysisStatusLabels = {
  pending: '분석 대기 중',
  indexing: '분석 중',
  ready: '분석 완료',
  failed: '분석 실패',
} as const

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
  const [deletingConversationId, setDeletingConversationId] = useState<string>()
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
      } catch (error: unknown) {
        if (isCurrent) setError(toUserFacingMessage(toRepoMindApiError(error)))
      } finally {
        if (isCurrent) setIsLoading(false)
      }
    }

    void loadWorkspace()

    return () => {
      isCurrent = false
    }
  }, [conversationId, repositoryId])

  async function handleQuestion(question: string): Promise<boolean> {
    if (!repositoryId || !repository || isResponding) return false

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
      return true
    } catch (error: unknown) {
      setConversation(previousConversation)
      setError(toUserFacingMessage(toRepoMindApiError(error)))
      return false
    } finally {
      setIsResponding(false)
    }
  }

  async function handleDeleteConversation(targetConversationId: string): Promise<void> {
    if (!repositoryId || isResponding || deletingConversationId) return

    setDeletingConversationId(targetConversationId)
    setError(undefined)

    try {
      await repoMindService.deleteConversation(targetConversationId)
      setConversations((current) =>
        current.filter((conversationSummary) => conversationSummary.id !== targetConversationId),
      )

      if (conversationId === targetConversationId) {
        setConversation(undefined)
        navigate(`/projects/${repositoryId}`, { replace: true })
      }
    } catch (error: unknown) {
      setError(toUserFacingMessage(toRepoMindApiError(error)))
    } finally {
      setDeletingConversationId(undefined)
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
  const isRepositoryReady = repository.analysis_status === 'ready'
  const composerDisabledMessage = isRepositoryReady
    ? undefined
    : '레포지토리 분석이 완료된 뒤 질문할 수 있습니다.'

  return (
    <main className="workspace-page">
      <ConversationSidebar
        repository={repository}
        conversations={conversations}
        activeConversationId={conversationId}
        deletingConversationId={deletingConversationId}
        onDeleteConversation={handleDeleteConversation}
      />

      <section className="chat-workspace">
        <header className="chat-header">
          <div>
            <strong>{repoName}</strong>
            <span>
              {repository.repository_url} · {repository.branch}
            </span>
          </div>
          <span className={`analysis-status analysis-status--${repository.analysis_status}`}>
            <span /> {analysisStatusLabels[repository.analysis_status]}
          </span>
        </header>

        {error && (
          <div className="workspace-alert">
            <span>{error}</span>
            {conversationId && <Link to={`/projects/${repository.id}`}>새 대화 시작</Link>}
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
          disabled={isResponding || !isRepositoryReady}
          disabledMessage={composerDisabledMessage}
          suggestions={[]}
          onSubmit={handleQuestion}
        />
      </section>
    </main>
  )
}
