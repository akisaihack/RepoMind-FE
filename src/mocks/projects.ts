import type { ProjectSummary } from '../types/api'

export const mockProjects: ProjectSummary[] = [
  {
    id: 'commerce-platform',
    name: 'Commerce Platform',
    description:
      '회원, 주문, 결제 흐름을 포함한 Spring 기반 커머스 백엔드 프로젝트입니다.',
    repository: 'company/commerce-platform',
    branch: 'develop',
    languages: ['Java', 'SQL'],
    frameworks: ['Spring Boot', 'JPA'],
    status: 'ready',
    lastAnalyzedAt: '2026-08-02T02:30:00.000Z',
  },
  {
    id: 'customer-portal',
    name: 'Customer Portal',
    description:
      '고객 프로필과 문의 내역을 관리하는 React·Flask 기반 사내 서비스입니다.',
    repository: 'company/customer-portal',
    branch: 'develop',
    languages: ['TypeScript', 'Python'],
    frameworks: ['React', 'Flask'],
    status: 'sample',
    lastAnalyzedAt: '2026-08-01T08:15:00.000Z',
  },
  {
    id: 'billing-batch',
    name: 'Billing Batch',
    description:
      '정산과 환불 배치를 처리하는 레거시 프로젝트의 샘플 분석 공간입니다.',
    repository: 'company/billing-batch',
    branch: 'develop',
    languages: ['Java', 'Shell'],
    frameworks: ['Spring Batch'],
    status: 'pending',
  },
]
