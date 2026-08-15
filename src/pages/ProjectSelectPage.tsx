import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { repoMindService } from '../services'
import type { RepositoryAnalysisStatus, RepositoryInfo } from '../types/api'
import '../styles/projects.css'

const statusLabels: Record<RepositoryAnalysisStatus, string> = {
  ready: '분석 완료',
  indexing: '분석 중',
  pending: '대기 중',
  failed: '분석 실패',
}

function extractRepoName(url: string) {
  const parts = url.split('/')
  return parts.length > 0 ? parts[parts.length - 1] : 'Unknown'
}

function RepositoryCard({ repository }: { repository: RepositoryInfo }) {
  const isAvailable = repository.analysis_status === 'ready'
  const repoName = extractRepoName(repository.repository_url)

  const handleDisabledClick = (e: React.MouseEvent) => {
    if (!isAvailable) {
      e.preventDefault()
      alert('분석이 완료된 레포지토리만 질문할 수 있습니다.')
    }
  }

  return (
    <article className="project-card">
      <div className="project-card__topline">
        <div className="project-card__mark" aria-hidden="true">
          {repoName.slice(0, 1).toUpperCase()}
        </div>
        <span className={`status-badge status-badge--${repository.analysis_status}`}>
          <span className="status-badge__dot" />
          {statusLabels[repository.analysis_status]}
        </span>
      </div>

      <div className="project-card__content">
        <h2>{repoName}</h2>
        <p>{repository.repository_url}</p>
      </div>

      <dl className="project-card__metadata">
        <div>
          <dt>Repository</dt>
          <dd>{repository.repository_url}</dd>
        </div>
        <div>
          <dt>Branch</dt>
          <dd>{repository.branch}</dd>
        </div>
      </dl>

      <Link
        className={`project-card__action ${!isAvailable ? 'project-card__action--disabled' : ''}`}
        to={`/projects/${repository.id}`}
        onClick={handleDisabledClick}
      >
        {isAvailable ? '이 레포지토리에 질문하기' : '분석 완료 후 이용 가능'}
        {isAvailable && <span aria-hidden="true">→</span>}
      </Link>
    </article>
  )
}

export function ProjectSelectPage() {
  const [repositories, setRepositories] = useState<RepositoryInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [url, setUrl] = useState('')
  const [branch, setBranch] = useState('main')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string>()

  const loadRepositories = () => {
    setIsLoading(true)
    repoMindService
      .getRepositories()
      .then((result) => setRepositories(result))
      .catch(() => setError('레포지토리 목록을 불러오지 못했습니다.'))
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    loadRepositories()
  }, [])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(undefined)

    const trimmedUrl = url.trim()
    const trimmedBranch = branch.trim()

    if (!trimmedUrl) {
      setFormError('GitHub 레포지토리 URL을 입력해주세요.')
      return
    }
    if (!trimmedUrl.startsWith('https://github.com/')) {
      setFormError('올바른 GitHub URL을 입력해주세요. (예: https://github.com/owner/repo)')
      return
    }
    if (!trimmedBranch) {
      setFormError('브랜치명을 입력해주세요.')
      return
    }

    setIsSubmitting(true)
    try {
      await repoMindService.createRepository(trimmedUrl, trimmedBranch)
      setUrl('')
      setBranch('main')
      loadRepositories() // 성공 시 목록 갱신
    } catch (err: any) {
      if (err.response?.status === 409) {
        setFormError('이미 등록된 레포지토리와 브랜치입니다.')
      } else if (err.response?.status === 400) {
        setFormError('잘못된 입력값입니다. URL을 다시 확인해주세요.')
      } else {
        setFormError('레포지토리 등록 중 서버 오류가 발생했습니다.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="projects-page">
      <header className="projects-header">
        <div className="brand">
          <span className="brand__symbol" aria-hidden="true">
            R
          </span>
          <span>RepoMind</span>
        </div>
        <span className="prototype-label">Graph-RAG Prototype</span>
      </header>

      <section className="projects-hero">
        <span className="eyebrow">PROJECT CONTEXT AGENT</span>
        <h1>어떤 레포지토리를 살펴볼까요?</h1>
        <p>
          레포지토리를 선택하면 코드 구조, 실행 흐름, 변경 배경을 근거와 함께
          질문할 수 있습니다.
        </p>

        <form className="repository-form" onSubmit={handleRegister}>
          <div className="repository-form__inputs">
            <input
              type="url"
              placeholder="https://github.com/owner/repo"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isSubmitting}
              required
            />
            <input
              type="text"
              placeholder="main"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              disabled={isSubmitting}
              required
              className="branch-input"
            />
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '등록 중...' : '등록하기'}
            </button>
          </div>
          {formError && <div className="repository-form__error">{formError}</div>}
        </form>
      </section>

      {isLoading && (
        <section className="project-grid" aria-label="레포지토리 불러오는 중">
          {[0, 1, 2].map((item) => (
            <div className="project-card project-card--skeleton" key={item} />
          ))}
        </section>
      )}

      {error && <div className="inline-alert inline-alert--error">{error}</div>}

      {!isLoading && !error && (
        <section className="project-grid" aria-label="분석 레포지토리 목록">
          {repositories.map((repo) => (
            <RepositoryCard key={repo.id} repository={repo} />
          ))}
        </section>
      )}
    </main>
  )
}
