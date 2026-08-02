export type ProjectAnalysisStatus = 'ready' | 'sample' | 'pending'

export interface ProjectSummary {
  id: string
  name: string
  description: string
  repository: string
  branch: string
  languages: string[]
  frameworks: string[]
  status: ProjectAnalysisStatus
  lastAnalyzedAt?: string
}

export type QuestionKind = 'location' | 'flow' | 'impact' | 'intent'

export type EvidenceType = 'code' | 'commit' | 'itsm' | 'document' | 'test'

export type ClaimKind = 'fact' | 'stated_intent' | 'inference'

export type ConfidenceLevel = 'high' | 'medium' | 'low'

export interface Evidence {
  id: string
  type: EvidenceType
  title: string
  location: string
  description: string
  excerpt?: string
}

export interface AnswerClaim {
  id: string
  kind: ClaimKind
  title: string
  content: string
  evidenceIds: string[]
}

export type GraphNodeType =
  | 'project'
  | 'module'
  | 'file'
  | 'symbol'
  | 'api'
  | 'commit'
  | 'document'

export type GraphEdgeType =
  | 'contains'
  | 'imports'
  | 'calls'
  | 'implements'
  | 'exposes'
  | 'changed_by'
  | 'documented_by'

export interface GraphNodeDto {
  id: string
  type: GraphNodeType
  label: string
  detail?: string
  metadata?: Record<string, string>
}

export interface GraphEdgeDto {
  id: string
  source: string
  target: string
  type: GraphEdgeType
  label?: string
}

export interface GraphDataDto {
  nodes: GraphNodeDto[]
  edges: GraphEdgeDto[]
}

export interface Confidence {
  level: ConfidenceLevel
  reason: string
}

export interface StructuredAnswer {
  summary: string
  claims: AnswerClaim[]
  evidence: Evidence[]
  confidence: Confidence
  graph?: GraphDataDto
  uncertainties?: string[]
  suggestedQuestions?: string[]
}

export type ChatRole = 'user' | 'assistant'

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  createdAt: string
  answer?: StructuredAnswer
}

export interface ConversationSummary {
  id: string
  projectId: string
  title: string
  updatedAt: string
}

export interface Conversation extends ConversationSummary {
  messages: ChatMessage[]
}

export interface AskQuestionRequest {
  projectId: string
  conversationId?: string
  question: string
  kind?: QuestionKind
}

export interface AskQuestionResponse {
  conversation: Conversation
  assistantMessage: ChatMessage
}
