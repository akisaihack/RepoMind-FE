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

      {isAvailable ? (
        <Link className="project-card__action" to={`/projects/${repository.id}`}>
          이 프로젝트에 질문하기
          <span aria-hidden="true">→</span>
        </Link>
      ) : (
        <span className="project-card__action project-card__action--disabled">
          분석 완료 후 이용 가능
        </span>
      )}
    </article>
  )
}

export function ProjectSelectPage() {
  const [repositories, setRepositories] = useState<RepositoryInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>()

  useEffect(() => {
    let isCurrent = true

    repoMindService
      .getRepositories()
      .then((result) => {
        if (isCurrent) setRepositories(result)
      })
      .catch(() => {
        if (isCurrent) setError('프로젝트 목록을 불러오지 못했습니다.')
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })

    return () => {
      isCurrent = false
    }
  }, [])

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
        <h1>어떤 프로젝트를 살펴볼까요?</h1>
        <p>
          프로젝트를 선택하면 코드 구조, 실행 흐름, 변경 배경을 근거와 함께
          질문할 수 있습니다.
        </p>
      </section>

      {isLoading && (
        <section className="project-grid" aria-label="프로젝트 불러오는 중">
          {[0, 1, 2].map((item) => (
            <div className="project-card project-card--skeleton" key={item} />
          ))}
        </section>
      )}

      {error && <div className="inline-alert inline-alert--error">{error}</div>}

      {!isLoading && !error && (
        <section className="project-grid" aria-label="분석 프로젝트 목록">
          {repositories.map((repo) => (
            <RepositoryCard key={repo.id} repository={repo} />
          ))}
        </section>
      )}

      <footer className="projects-footer">
        현재 화면은 1주차 검증을 위한 Mock 데이터로 동작합니다.
      </footer>
    </main>
  )
}
