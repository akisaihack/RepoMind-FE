import type {
  ChatMessage,
  ClaimKind,
  ConfidenceLevel,
  EvidenceType,
} from '../../types/api'
import { CodeFlowGraph } from '../graph/CodeFlowGraph'
import { MarkdownContent } from './MarkdownContent'

interface AssistantResponseProps {
  message: ChatMessage
}

const claimLabels: Record<ClaimKind, string> = {
  fact: '확인된 사실',
  stated_intent: '명시된 의도',
  inference: 'AI 추론',
}

const evidenceLabels: Record<EvidenceType, string> = {
  code: 'CODE',
  commit: 'COMMIT',
  itsm: 'ITSM',
  document: 'DOCS',
  test: 'TEST',
}

const confidenceLabels: Record<ConfidenceLevel, string> = {
  high: '높음',
  medium: '보통',
  low: '낮음',
}

export function AssistantResponse({ message }: AssistantResponseProps) {
  const answer = message.answer
  const hasGraphNodes = Boolean(answer?.graph && answer.graph.nodes.length > 0)

  return (
    <article className="chat-message chat-message--assistant">
      <div className="chat-message__avatar" aria-hidden="true">
        R
      </div>
      <div className="chat-message__body">
        <div className="chat-message__author">RepoMind</div>
        {!answer && <MarkdownContent className="markdown-content chat-message__summary" content={message.content} />}

        {answer && (
          <div className="structured-answer">
            <section className="claim-list" aria-label="답변 근거 구분">
              {answer.claims.map((claim) => (
                <article className={`claim-card claim-card--${claim.kind}`} key={claim.id}>
                  <span className="claim-card__kind">{claimLabels[claim.kind]}</span>
                  <h3>{claim.title}</h3>
                  <MarkdownContent className="markdown-content" content={claim.content} />
                  <div className="claim-card__references">
                    {claim.evidenceIds.map((evidenceId) => {
                      const evidenceIndex = answer.evidence.findIndex(
                        (evidence) => evidence.id === evidenceId,
                      )
                      return evidenceIndex >= 0 ? (
                        <a href={`#evidence-${evidenceId}`} key={evidenceId}>
                          근거 {evidenceIndex + 1}
                        </a>
                      ) : null
                    })}
                  </div>
                </article>
              ))}
            </section>

            {hasGraphNodes && answer.graph && (
              <details className="answer-panel" open>
                <summary>
                  <span>
                    <strong>코드 실행 흐름</strong>
                    <small>{answer.graph.nodes.length}개 노드</small>
                  </span>
                </summary>
                <CodeFlowGraph graph={answer.graph} />
              </details>
            )}

            <details className="answer-panel" open>
              <summary>
                <span>
                  <strong>확인한 근거</strong>
                  <small>{answer.evidence.length}개 출처</small>
                </span>
              </summary>
              <ol className="evidence-list">
                {answer.evidence.map((evidence) => (
                  <li id={`evidence-${evidence.id}`} key={evidence.id}>
                    <div className="evidence-list__header">
                      <span className={`evidence-type evidence-type--${evidence.type}`}>
                        {evidenceLabels[evidence.type]}
                      </span>
                      <code>{evidence.location}</code>
                    </div>
                    <strong>{evidence.title}</strong>
                    <MarkdownContent className="markdown-content evidence-list__description" content={evidence.description} />
                    {evidence.excerpt && <pre>{evidence.excerpt}</pre>}
                  </li>
                ))}
              </ol>
            </details>

            <section className="answer-confidence">
              <div>
                <span>답변 확실성</span>
                <strong className={`confidence confidence--${answer.confidence.level}`}>
                  {confidenceLabels[answer.confidence.level]}
                </strong>
              </div>
              <p>{answer.confidence.reason}</p>
            </section>

            {answer.uncertainties && answer.uncertainties.length > 0 && (
              <section className="answer-uncertainty">
                <strong>추가 확인이 필요한 부분</strong>
                <ul>
                  {answer.uncertainties.map((uncertainty) => (
                    <li key={uncertainty}>{uncertainty}</li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
