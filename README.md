# RepoMind Frontend

기존 프로젝트의 코드 구조와 개발 의도를 근거와 함께 탐색하는 Graph-RAG 기반 AI Agent의 프런트엔드입니다.

현재는 1주차 목표에 맞춰 백엔드 없이 Mock 데이터로 독립 실행됩니다.

## 실행

```bash
npm install
npm run dev
```

품질 검증 명령은 다음과 같습니다.

```bash
npm run lint
npm run build
```

## 현재 구현 범위

- 분석 프로젝트 선택
- 프로젝트별 대화형 Workspace
- 연속 질문과 답변 누적
- 확인된 사실·명시된 의도·AI 추론 구분
- 코드·커밋·ITSM 근거 표시
- React Flow 기반 코드 호출 흐름
- Mock 대화의 `localStorage` 보존
- 데스크톱·모바일 기본 반응형 처리

## 라우팅

```text
/projects
  프로젝트 선택

/projects/:projectId
  선택한 프로젝트의 새 대화

/projects/:projectId/conversations/:conversationId
  저장된 대화 조회 및 후속 질문
```

## 디렉터리 구조

```text
src/
├─ app/             라우터 등 애플리케이션 진입 설정
├─ features/        chat, graph 등 기능 단위 UI
├─ layouts/         공통 페이지 레이아웃
├─ mocks/           1주차 Mock 프로젝트와 AI 답변
├─ pages/           라우트 단위 화면
├─ services/        데이터 소스 추상화 및 Mock 구현체
├─ styles/          전역·화면별 스타일
└─ types/           백엔드·AI 연동용 DTO
```

## API 연동 원칙

화면 컴포넌트는 Mock 데이터를 직접 참조하지 않고 `RepoMindService` 인터페이스를 통해 접근합니다. 실제 Flask API를 연결할 때는 `services/mockRepoMindService.ts`를 HTTP 기반 구현체로 교체하고, `types/api.ts`의 DTO를 백엔드와 공유하면 됩니다.

Mock 대화 데이터는 브라우저의 `repomind.mock.conversations.v1` 키에 저장됩니다.
