import { Link, NavLink } from 'react-router-dom'
import type { ConversationSummary, RepositoryInfo } from '../../types/api'

interface ConversationSidebarProps {
  repository: RepositoryInfo
  conversations: ConversationSummary[]
  activeConversationId?: string
  deletingConversationId?: string
  onDeleteConversation(conversationId: string): Promise<void>
}

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}

function extractRepoName(url: string) {
  const parts = url.split('/')
  return parts.length > 0 ? parts[parts.length - 1] : 'Unknown'
}

export function ConversationSidebar({
  repository,
  conversations,
  activeConversationId,
  deletingConversationId,
  onDeleteConversation,
}: ConversationSidebarProps) {
  const repoName = extractRepoName(repository.repository_url)

  async function handleDeleteConversation(conversation: ConversationSummary) {
    if (!window.confirm(`“${conversation.title}” 대화와 모든 메시지를 삭제할까요?`)) {
      return
    }

    await onDeleteConversation(conversation.id)
  }

  return (
    <aside className="conversation-sidebar">
      <div className="conversation-sidebar__header">
        <Link className="sidebar-brand" to="/projects">
          <span className="sidebar-brand__symbol" aria-hidden="true">
            R
          </span>
          <span>RepoMind</span>
        </Link>

        <Link
          className="new-conversation-button"
          to={`/projects/${repository.id}`}
          aria-current={!activeConversationId ? 'page' : undefined}
        >
          <span aria-hidden="true">＋</span>
          새 대화
        </Link>
      </div>

      <nav className="conversation-navigation" aria-label="대화 기록">
        <p className="conversation-navigation__label">최근 대화</p>
        {conversations.length === 0 ? (
          <p className="conversation-navigation__empty">
            아직 저장된 대화가 없습니다.
          </p>
        ) : (
          <ul>
            {conversations.map((conversation) => (
              <li className="conversation-item" key={conversation.id}>
                <NavLink
                  className={({ isActive }) =>
                    isActive ? 'conversation-link is-active' : 'conversation-link'
                  }
                  to={`/projects/${repository.id}/conversations/${conversation.id}`}
                >
                  <span>{conversation.title}</span>
                  <time dateTime={conversation.updatedAt}>
                    {formatUpdatedAt(conversation.updatedAt)}
                  </time>
                </NavLink>
                <button
                  type="button"
                  className="conversation-delete-button"
                  aria-label={`${conversation.title} 삭제`}
                  disabled={Boolean(deletingConversationId)}
                  onClick={() => void handleDeleteConversation(conversation)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </nav>

      <div className="conversation-sidebar__project">
        <div className="project-summary__mark" aria-hidden="true">
          {repoName.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <strong>{repoName}</strong>
          <span>{repository.branch}</span>
        </div>
        <Link to="/projects" aria-label="다른 프로젝트 선택">
          변경
        </Link>
      </div>
    </aside>
  )
}
