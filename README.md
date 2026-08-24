# RepoMind Frontend

기존 프로젝트의 코드 구조와 개발 의도를 근거와 함께 탐색하는 Graph-RAG 기반 AI Agent의 프런트엔드입니다.

백엔드 API를 통해 프로젝트·대화·질의응답 데이터를 조회합니다.

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
├─ pages/           라우트 단위 화면
├─ services/        백엔드 API 연동
├─ styles/          전역·화면별 스타일
└─ types/           백엔드·AI 연동용 DTO
```

## API 연동 원칙

화면 컴포넌트는 `RepoMindService` 인터페이스를 통해 백엔드 API에 접근하며, HTTP 구현체는 `services/apiRepoMindService.ts`에 있습니다.

## 실제 API 수동 검증

1. `.env.example`을 참고해 `.env.local`에 백엔드 주소를 설정한다.
2. 백엔드에서 분석 상태가 `ready`인 레포지토리를 하나 준비한 뒤 `npm run dev`를 실행한다.
3. 해당 레포지토리를 열고 첫 질문을 전송한다. 세션 생성과 URL 전환을 확인한다.
4. 페이지를 새로고침해 세션 목록과 메시지 이력이 복원되는지 확인한 뒤, 같은 대화에서 후속 질문을 전송한다.

현재 백엔드 Chat API가 메시지 영속화를 제공하기 전에는 질문 전송 뒤 이력 동기화 오류가 표시되는 것이 정상이다. 세션 생성 및 조회는 계속 검증할 수 있다.
