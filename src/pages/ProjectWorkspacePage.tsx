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
  ProjectSummary,
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

export function ProjectWorkspacePage() {
  const { projectId, conversationId } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState<ProjectSummary>()
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [conversation, setConversation] = useState<Conversation>()
  const [isLoading, setIsLoading] = useState(true)
  const [isResponding, setIsResponding] = useState(false)
  const [error, setError] = useState<string>()

  useEffect(() => {
    let isCurrent = true

    async function loadWorkspace() {
      if (!projectId) return

      setIsLoading(true)
      setError(undefined)

      try {
        const [projectResult, conversationResults, conversationResult] =
          await Promise.all([
            repoMindService.getProject(projectId),
            repoMindService.getConversations(projectId),
            conversationId
              ? repoMindService.getConversation(projectId, conversationId)
              : Promise.resolve(undefined),
          ])

        if (!isCurrent) return
        setProject(projectResult)
        setConversations(conversationResults)
        setConversation(conversationResult)

        if (!projectResult) {
          setError('존재하지 않는 프로젝트입니다.')
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
  }, [conversationId, projectId])

  async function handleQuestion(question: string) {
    if (!projectId || !project || isResponding) return

    const previousConversation = conversation
    const optimisticMessage = createOptimisticMessage(question)
    const optimisticConversation: Conversation = {
      id: conversation?.id ?? 'new-conversation',
      projectId,
      title: conversation?.title ?? question,
      updatedAt: optimisticMessage.createdAt,
      messages: [...(conversation?.messages ?? []), optimisticMessage],
    }

    setConversation(optimisticConversation)
    setIsResponding(true)
    setError(undefined)

    try {
      const response = await repoMindService.askQuestion({
        projectId,
        conversationId,
        question,
      })

      setConversation(response.conversation)
      const updatedConversations = await repoMindService.getConversations(projectId)
      setConversations(updatedConversations)

      if (response.conversation.id !== conversationId) {
        navigate(
          `/projects/${projectId}/conversations/${response.conversation.id}`,
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
        <p>프로젝트 맥락을 불러오고 있습니다.</p>
      </main>
    )
  }

  if (!project) {
    return (
      <main className="status-page">
        <div className="status-page__card">
          <span className="eyebrow">PROJECT NOT FOUND</span>
          <h1>프로젝트를 열 수 없습니다.</h1>
          <p>{error}</p>
          <Link className="primary-button" to="/projects">
            프로젝트 목록으로
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="workspace-page">
      <ConversationSidebar
        project={project}
        conversations={conversations}
        activeConversationId={conversationId}
      />

      <section className="chat-workspace">
        <header className="chat-header">
          <div>
            <strong>{project.name}</strong>
            <span>
              {project.repository} · {project.branch}
            </span>
          </div>
          <span className="analysis-ready">
            <span /> Mock 분석 완료
          </span>
        </header>

        {error && conversationId && (
          <div className="workspace-alert">
            <span>{error}</span>
            <Link to={`/projects/${project.id}`}>새 대화 시작</Link>
          </div>
        )}

        <div className="chat-scroll-area">
          <MessageList
            messages={conversation?.messages ?? []}
            isResponding={isResponding}
            projectName={project.name}
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
