import { ApiRepoMindService } from './apiRepoMindService'
import { MockRepoMindService } from './mockRepoMindService'
import type { RepoMindService } from './repoMindService'

const useMock = import.meta.env.VITE_USE_MOCK === 'true'

export const repoMindService: RepoMindService = useMock
  ? new MockRepoMindService()
  : new ApiRepoMindService()
