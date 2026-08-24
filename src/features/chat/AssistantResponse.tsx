import type {
  ChatMessage,
  ClaimKind,
  ConfidenceLevel,
  Evidence,
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

const DEFAULT_VISIBLE_EVIDENCE_COUNT = 5

function stripEmbeddingContext(text: string) {
  const lines = text.split('\n')
  let index = 0
  for (const prefix of ['// package: ', '// class: ', '// method: ']) {
    if (lines[index]?.startsWith(prefix)) index += 1
  }
  return lines.slice(index).join('\n')
}

function getEvidenceDisplay(evidence: Evidence) {
  const rawExcerpt = evidence.excerpt ?? ''
  const rawFullExcerpt = evidence.fullExcerpt ?? rawExcerpt
  const hasEmbeddingContext = rawExcerpt.startsWith('// package: ') || rawExcerpt.startsWith('// class: ')
  const classMatch = rawExcerpt.match(/^\/\/ class: (.+?)(?: \([^)]*\))?$/m)
  const methodMatch = rawExcerpt.match(/^\/\/ method: (.+)$/m)
  const excerpt = hasEmbeddingContext ? stripEmbeddingContext(rawExcerpt) : rawExcerpt
  const fullExcerpt = rawFullExcerpt.startsWith('// package: ') || rawFullExcerpt.startsWith('// class: ')
    ? stripEmbeddingContext(rawFullExcerpt)
    : rawFullExcerpt
  const hasFullExcerpt = fullExcerpt !== excerpt
  const preview = [
    evidence.hasMoreBefore ? '…' : '',
    excerpt,
    evidence.hasMoreAfter ? '…' : '',
  ].filter(Boolean).join('\n')

  return {
    title: evidence.type === 'code' && methodMatch
      ? `${classMatch?.[1] ? `${classMatch[1]}.` : ''}${methodMatch[1]}`
      : evidence.title,
    description: hasEmbeddingContext ? '' : evidence.description,
    excerpt,
    fullExcerpt,
    preview,
    hasFullExcerpt,
  }
}

function EvidenceCard({ evidence }: { evidence: Evidence }) {
  const display = getEvidenceDisplay(evidence)

  return (
    <li>
      <details className="evidence-card" id={`evidence-${evidence.id}`}>
        <summary>
          <div className="evidence-list__header">
            <span className={`evidence-type evidence-type--${evidence.type}`}>
              {evidenceLabels[evidence.type]}
            </span>
            <code title={evidence.location}>{evidence.location}</code>
          </div>
          <strong className="evidence-card__title">{display.title}</strong>
        </summary>
        <div className="evidence-card__content">
          {display.description && (
            <MarkdownContent className="markdown-content evidence-list__description" content={display.description} />
          )}
          {display.excerpt && <pre>{display.preview}</pre>}
          {display.hasFullExcerpt && (
            <details className="evidence-card__full-code">
              <summary>전체 코드 보기</summary>
              <pre>{display.fullExcerpt}</pre>
            </details>
          )}
        </div>
      </details>
    </li>
  )
}

function ClaimReferences({ evidenceIds, evidence }: { evidenceIds: string[]; evidence: Evidence[] }) {
  const referencedEvidence = evidenceIds
    .map((evidenceId) => evidence.find((item) => item.id === evidenceId))
    .filter((item): item is Evidence => item !== undefined)

  if (referencedEvidence.length === 0) return null

  const openEvidence = (id: string) => {
    const element = document.getElementById(`evidence-${id}`)
    if (element instanceof HTMLDetailsElement) element.open = true
  }

  return (
    <div className="claim-card__references">
      <div className="claim-card__reference-menu">
        <button aria-label={`관련 근거 ${referencedEvidence.length}개 보기`} type="button">
          근거 +{referencedEvidence.length}
        </button>
        <div className="claim-card__reference-popover" role="tooltip">
          <strong>관련 근거 {referencedEvidence.length}개</strong>
          <ol>
            {referencedEvidence.map((item) => (
              <li key={item.id}>
                <a href={`#evidence-${item.id}`} onClick={() => openEvidence(item.id)}>
                  {item.title}
                </a>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}

export function AssistantResponse({ message }: AssistantResponseProps) {
  const answer = message.answer
  const hasFlowGraph = Boolean(
    answer?.graph?.edges.some((edge) => edge.type.toUpperCase() === 'CALLS'),
  )
  const visibleEvidence = answer?.evidence.slice(0, DEFAULT_VISIBLE_EVIDENCE_COUNT) ?? []
  const additionalEvidence = answer?.evidence.slice(DEFAULT_VISIBLE_EVIDENCE_COUNT) ?? []

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
            {answer.summary && (
              <section className="answer-summary" aria-label="답변 요약">
                <MarkdownContent className="markdown-content" content={answer.summary} />
              </section>
            )}

            <ul className="claim-list" aria-label="상세 답변">
              {answer.claims.map((claim) => (
                <li className={`claim-card claim-card--${claim.kind}`} key={claim.id}>
                  <article>
                    <span className="claim-card__kind">{claimLabels[claim.kind]}</span>
                    <h3>{claim.title}</h3>
                    <MarkdownContent className="markdown-content" content={claim.content} />
                    <ClaimReferences evidence={answer.evidence} evidenceIds={claim.evidenceIds} />
                  </article>
                </li>
              ))}
            </ul>

            {hasFlowGraph && answer.graph && (
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
                {visibleEvidence.map((evidence) => <EvidenceCard evidence={evidence} key={evidence.id} />)}
              </ol>
              {additionalEvidence.length > 0 && (
                <details className="evidence-more">
                  <summary>추가 근거 {additionalEvidence.length}개</summary>
                  <ol className="evidence-list">
                    {additionalEvidence.map((evidence) => <EvidenceCard evidence={evidence} key={evidence.id} />)}
                  </ol>
                </details>
              )}
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
