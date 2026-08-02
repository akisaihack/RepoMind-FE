import { Link, NavLink } from 'react-router-dom'
import type { ConversationSummary, ProjectSummary } from '../../types/api'

interface ConversationSidebarProps {
  project: ProjectSummary
  conversations: ConversationSummary[]
  activeConversationId?: string
}

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}

export function ConversationSidebar({
  project,
  conversations,
  activeConversationId,
}: ConversationSidebarProps) {
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
          to={`/projects/${project.id}`}
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
              <li key={conversation.id}>
                <NavLink
                  className={({ isActive }) =>
                    isActive ? 'conversation-link is-active' : 'conversation-link'
                  }
                  to={`/projects/${project.id}/conversations/${conversation.id}`}
                >
                  <span>{conversation.title}</span>
                  <time dateTime={conversation.updatedAt}>
                    {formatUpdatedAt(conversation.updatedAt)}
                  </time>
                </NavLink>
              </li>
            ))}
          </ul>
        )}
      </nav>

      <div className="conversation-sidebar__project">
        <div className="project-summary__mark" aria-hidden="true">
          {project.name.slice(0, 1)}
        </div>
        <div>
          <strong>{project.name}</strong>
          <span>{project.branch}</span>
        </div>
        <Link to="/projects" aria-label="다른 프로젝트 선택">
          변경
        </Link>
      </div>
    </aside>
  )
}
