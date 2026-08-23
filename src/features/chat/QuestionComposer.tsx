import { useState, type FormEvent, type KeyboardEvent } from 'react'

interface QuestionComposerProps {
  disabled?: boolean
  disabledMessage?: string
  suggestions: string[]
  onSubmit(question: string): Promise<boolean>
}

export function QuestionComposer({
  disabled = false,
  disabledMessage,
  suggestions,
  onSubmit,
}: QuestionComposerProps) {
  const [question, setQuestion] = useState('')

  async function submitQuestion(value: string) {
    const normalizedQuestion = value.trim()
    if (!normalizedQuestion || disabled) return

    const wasSubmitted = await onSubmit(normalizedQuestion)
    if (wasSubmitted) setQuestion('')
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void submitQuestion(question)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault()
      event.currentTarget.form?.requestSubmit()
    }
  }

  return (
    <div className="question-composer-wrapper">
      {suggestions.length > 0 && (
        <div className="question-suggestions" aria-label="추천 질문">
          {suggestions.map((suggestion) => (
            <button
              type="button"
              key={suggestion}
              onClick={() => void submitQuestion(suggestion)}
              disabled={disabled}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <form className="question-composer" onSubmit={handleSubmit}>
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="프로젝트의 구조나 개발 의도를 질문해 보세요"
          aria-label="프로젝트 질문"
          rows={1}
          disabled={disabled}
        />
        <button
          type="submit"
          className="question-composer__submit"
          disabled={disabled || question.trim().length === 0}
          aria-label="질문 보내기"
        >
          <span aria-hidden="true">↑</span>
        </button>
      </form>
      <p className="question-composer__hint">
        {disabledMessage ?? 'RepoMind는 확인된 근거와 AI의 추론을 구분해 표시합니다.'}
      </p>
    </div>
  )
}
