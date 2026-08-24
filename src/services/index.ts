import { ApiRepoMindService } from './apiRepoMindService'
import type { RepoMindService } from './repoMindService'

export const repoMindService: RepoMindService = new ApiRepoMindService()
