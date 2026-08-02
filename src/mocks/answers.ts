import type { QuestionKind, StructuredAnswer } from '../types/api'

function inferQuestionKind(question: string): QuestionKind {
  const normalized = question.toLowerCase()

  if (['왜', '이유', '의도', '배경'].some((keyword) => normalized.includes(keyword))) {
    return 'intent'
  }

  if (['영향', '수정', '변경', '참조'].some((keyword) => normalized.includes(keyword))) {
    return 'impact'
  }

  if (['어디', '위치', '파일', '메서드'].some((keyword) => normalized.includes(keyword))) {
    return 'location'
  }

  return 'flow'
}

const memberFlowGraph = {
  nodes: [
    {
      id: 'withdraw-api',
      type: 'api' as const,
      label: 'DELETE /members/me',
      detail: 'MemberController.withdraw',
    },
    {
      id: 'member-service',
      type: 'symbol' as const,
      label: 'MemberService.withdraw',
      detail: '회원 탈퇴 유스케이스',
    },
    {
      id: 'member-policy',
      type: 'symbol' as const,
      label: 'MemberPolicy.validateWithdrawal',
      detail: '탈퇴 가능 여부 검증',
    },
    {
      id: 'member-repository',
      type: 'symbol' as const,
      label: 'MemberRepository.softDelete',
      detail: 'deletedAt 갱신',
    },
  ],
  edges: [
    {
      id: 'edge-api-service',
      source: 'withdraw-api',
      target: 'member-service',
      type: 'calls' as const,
      label: 'CALLS',
    },
    {
      id: 'edge-service-policy',
      source: 'member-service',
      target: 'member-policy',
      type: 'calls' as const,
      label: 'CALLS',
    },
    {
      id: 'edge-service-repository',
      source: 'member-service',
      target: 'member-repository',
      type: 'calls' as const,
      label: 'CALLS',
    },
  ],
}

const memberEvidence = [
  {
    id: 'member-controller',
    type: 'code' as const,
    title: '회원 탈퇴 API',
    location: 'src/member/MemberController.java:84',
    description: 'DELETE 요청을 받아 MemberService.withdraw를 호출합니다.',
    excerpt: '@DeleteMapping("/members/me")',
  },
  {
    id: 'member-service',
    type: 'code' as const,
    title: '회원 탈퇴 처리',
    location: 'src/member/MemberService.java:126',
    description: '정책 검증 후 회원의 deletedAt을 갱신합니다.',
  },
  {
    id: 'withdraw-issue',
    type: 'itsm' as const,
    title: 'MEMBER-142 개인정보 보존 정책 반영',
    location: 'ITSM MEMBER-142',
    description: '법정 보존 기간 동안 주문 연결 정보를 유지해야 한다고 명시합니다.',
  },
  {
    id: 'withdraw-commit',
    type: 'commit' as const,
    title: 'feat: 회원 논리 삭제 정책 적용',
    location: 'commit a1b2c3d',
    description: '물리 삭제 로직을 deletedAt 기반 논리 삭제로 변경했습니다.',
  },
]

function createIntentAnswer(): StructuredAnswer {
  return {
    summary:
      '회원 정보가 물리 삭제되지 않는 주된 이유는 주문·결제 이력의 참조 무결성과 개인정보 보존 정책을 함께 만족하기 위해서입니다.',
    claims: [
      {
        id: 'intent-fact',
        kind: 'fact',
        title: '코드에서 확인된 동작',
        content:
          'MemberService.withdraw는 회원 레코드를 삭제하지 않고 deletedAt과 status를 갱신합니다.',
        evidenceIds: ['member-service'],
      },
      {
        id: 'intent-stated',
        kind: 'stated_intent',
        title: '명시적으로 확인된 의도',
        content:
          'MEMBER-142에는 주문 이력 연결과 법정 보존 기간을 유지해야 한다는 요구사항이 기록되어 있습니다.',
        evidenceIds: ['withdraw-issue', 'withdraw-commit'],
      },
      {
        id: 'intent-inference',
        kind: 'inference',
        title: 'AI가 추론한 의도',
        content:
          '복구 요청이나 감사 대응 시 기존 회원 식별자를 유지하려는 목적도 있는 것으로 보이지만, 관련 문서 확인이 더 필요합니다.',
        evidenceIds: ['member-service'],
      },
    ],
    evidence: memberEvidence,
    confidence: {
      level: 'high',
      reason: '코드, 커밋, ITSM 기록에서 동일한 변경 배경을 확인했습니다.',
    },
    graph: memberFlowGraph,
    uncertainties: [
      '탈퇴 회원의 개인정보 익명화 시점은 현재 샘플 근거만으로 확정할 수 없습니다.',
    ],
    suggestedQuestions: [
      '탈퇴 후 개인정보는 언제 익명화돼?',
      'MemberService.withdraw를 변경하면 어디에 영향이 있어?',
    ],
  }
}

function createImpactAnswer(): StructuredAnswer {
  return {
    summary:
      'MemberService.withdraw 변경 시 탈퇴 API, 회원 정책 검증, 회원 저장소와 주문 조회 로직을 우선 확인해야 합니다.',
    claims: [
      {
        id: 'impact-fact',
        kind: 'fact',
        title: '직접 영향 범위',
        content:
          'MemberController와 MemberPolicy가 직접 연결되고, MemberRepository의 softDelete가 상태 변경을 저장합니다.',
        evidenceIds: ['member-controller', 'member-service'],
      },
      {
        id: 'impact-inference',
        kind: 'inference',
        title: '간접 영향 후보',
        content:
          '활성 회원만 조회하는 주문·인증 쿼리가 탈퇴 상태 정의에 의존할 가능성이 있습니다.',
        evidenceIds: ['member-service'],
      },
    ],
    evidence: memberEvidence.slice(0, 3),
    confidence: {
      level: 'medium',
      reason: '직접 호출 관계는 확인했지만 런타임 쿼리 사용처는 추가 분석이 필요합니다.',
    },
    graph: memberFlowGraph,
    uncertainties: ['이벤트 구독자와 외부 시스템 연동은 현재 그래프 범위에 포함되지 않았습니다.'],
    suggestedQuestions: ['탈퇴 상태를 참조하는 쿼리를 보여줘', '관련 테스트 코드는 어디 있어?'],
  }
}

function createLocationAnswer(): StructuredAnswer {
  return {
    summary:
      '회원 탈퇴 기능은 MemberController의 DELETE /members/me에서 시작하며 핵심 로직은 MemberService.withdraw에 있습니다.',
    claims: [
      {
        id: 'location-fact',
        kind: 'fact',
        title: '우선 확인할 코드',
        content:
          'MemberController → MemberService → MemberPolicy와 MemberRepository 순서로 읽으면 전체 흐름을 빠르게 파악할 수 있습니다.',
        evidenceIds: ['member-controller', 'member-service'],
      },
    ],
    evidence: memberEvidence.slice(0, 2),
    confidence: {
      level: 'high',
      reason: 'API 매핑과 정적 호출 관계가 코드에 명시되어 있습니다.',
    },
    graph: memberFlowGraph,
    suggestedQuestions: ['회원 탈퇴 요청의 전체 실행 흐름을 설명해줘'],
  }
}

function createFlowAnswer(): StructuredAnswer {
  return {
    summary:
      '요청은 MemberController에서 시작해 MemberService의 유스케이스와 MemberPolicy 검증을 거친 뒤 MemberRepository에 상태를 저장합니다.',
    claims: [
      {
        id: 'flow-fact',
        kind: 'fact',
        title: '주요 실행 순서',
        content:
          'DELETE /members/me → MemberService.withdraw → MemberPolicy.validateWithdrawal → MemberRepository.softDelete 순서입니다.',
        evidenceIds: ['member-controller', 'member-service'],
      },
    ],
    evidence: memberEvidence.slice(0, 2),
    confidence: {
      level: 'high',
      reason: '컨트롤러 진입점과 주요 메서드 호출 관계를 코드에서 확인했습니다.',
    },
    graph: memberFlowGraph,
    suggestedQuestions: ['왜 논리 삭제로 구현되어 있어?', '이 로직을 수정하면 영향 범위가 어떻게 돼?'],
  }
}

export function createMockAnswer(
  question: string,
  requestedKind?: QuestionKind,
): StructuredAnswer {
  const kind = requestedKind ?? inferQuestionKind(question)

  switch (kind) {
    case 'intent':
      return createIntentAnswer()
    case 'impact':
      return createImpactAnswer()
    case 'location':
      return createLocationAnswer()
    case 'flow':
      return createFlowAnswer()
  }
}
