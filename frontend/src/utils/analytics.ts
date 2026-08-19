export type ToolId = 'highly-skilled' | 'permanent-residence' | 'rental'
export type AnalyticsEvent =
  | { type: 'tool_view'; toolId: ToolId }
  | { type: 'tool_complete'; toolId: ToolId }

export function trackEvent(event: AnalyticsEvent) {
  if (import.meta.env.DEV) console.debug('[analytics]', event)
}
