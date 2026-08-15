import type { RepositoryInfo } from '../types/api'

export const mockRepositories: RepositoryInfo[] = [
  {
    id: 'commerce-platform',
    repository_url: 'https://github.com/company/commerce-platform',
    branch: 'develop',
    latest_analyzed_sha: 'a1b2c3d4',
    analysis_status: 'ready',
  },
  {
    id: 'customer-portal',
    repository_url: 'https://github.com/company/customer-portal',
    branch: 'develop',
    latest_analyzed_sha: 'e5f6g7h8',
    analysis_status: 'indexing',
  },
  {
    id: 'billing-batch',
    repository_url: 'https://github.com/company/billing-batch',
    branch: 'develop',
    latest_analyzed_sha: null,
    analysis_status: 'pending',
  },
]
