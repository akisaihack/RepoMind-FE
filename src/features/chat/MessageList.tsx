import { useEffect, useRef } from 'react'
import type { ChatMessage } from '../../types/api'
import { AssistantResponse } from './AssistantResponse'

interface MessageListProps {
  messages: ChatMessage[]
  isResponding: boolean
  projectName: string
}

function UserMessage({ message }: { message: ChatMessage }) {
  return (
    <article className="chat-message chat-message--user">
      <div className="chat-message__body">
        <div className="chat-message__author">나</div>
        <p>{message.content}</p>
      </div>
    </article>
  )
}

export function MessageList({
  messages,
  isResponding,
  projectName,
}: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [isResponding, messages])

  return (
    <div className="message-list" aria-live="polite">
      {messages.length === 0 ? (
        <section className="empty-conversation">
          <div className="empty-conversation__symbol" aria-hidden="true">
            R
          </div>
          <span className="eyebrow">{projectName}</span>
          <h1>프로젝트에 대해 무엇이든 물어보세요.</h1>
          <p>
            관련 코드와 호출 관계를 찾고, 개발 의도를 확인 가능한 근거와 함께
            설명합니다.
          </p>
        </section>
      ) : (
        messages.map((message) =>
          message.role === 'assistant' ? (
            <AssistantResponse key={message.id} message={message} />
          ) : (
            <UserMessage key={message.id} message={message} />
          ),
        )
      )}

      {isResponding && (
        <div className="chat-message chat-message--assistant chat-message--loading">
          <div className="chat-message__avatar" aria-hidden="true">
            R
          </div>
          <div className="chat-message__body">
            <div className="chat-message__author">RepoMind</div>
            <div className="typing-indicator" aria-label="답변 생성 중">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      )}
      <div ref={endRef} />
    </div>
  )
}
