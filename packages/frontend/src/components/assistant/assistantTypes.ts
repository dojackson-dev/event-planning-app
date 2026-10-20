export type AssistantRole = 'owner' | 'promoter' | 'vendor' | 'artist'

export type Severity = 'urgent' | 'attention' | 'info'

export interface AssistantItem { label: string; detail: string; href: string }
export interface AssistantTask {
  key: string
  label: string
  count: number
  amount?: number
  severity: Severity
  href: string
  items: AssistantItem[]
}
export interface AssistantEvent { id: string; name: string; date: string; startTime: string | null; href: string; notes: string[] }
export interface PriorityReason { text: string; actor: 'you' | 'client' }
export interface DraftTarget { type: 'invoice' | 'estimate' | 'contract'; id: string; label: string }
export interface AssistantPriority {
  key: string
  severity: Severity
  title: string
  reasons: PriorityReason[]
  href: string
  actionLabel: string
  fingerprint: string
  targets: DraftTarget[]
}
export interface HiddenPriority { key: string; title: string; kind: 'snooze' | 'handled'; until: string | null }
export interface AssistantActivity { text: string; at: string; href: string }
export interface AssistantSummary {
  generatedAt: string
  headline: string
  allClear: boolean
  upcomingEvents: AssistantEvent[]
  priorities: AssistantPriority[]
  recentActivity: AssistantActivity[]
  tasks: AssistantTask[]
  hidden: HiddenPriority[]
  suggestedQuestions: string[]
  canDismiss: boolean
}
export interface AskAnswer { intent: string | null; answer: string; items: AssistantItem[] }
export interface Draft { to: string; subject: string; body: string }

export const errorMessage = (e: unknown, fallback: string): string => {
  const message = (e as { response?: { data?: { message?: unknown } } })?.response?.data?.message
  return typeof message === 'string' ? message : fallback
}
