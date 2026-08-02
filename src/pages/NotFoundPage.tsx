import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <main className="status-page">
      <div className="status-page__card">
        <span className="eyebrow">404</span>
        <h1>요청한 화면을 찾을 수 없습니다.</h1>
        <p>주소가 올바른지 확인하거나 프로젝트 목록으로 돌아가 주세요.</p>
        <Link className="primary-button" to="/projects">
          프로젝트 목록으로
        </Link>
      </div>
    </main>
  )
}
