export type ToolId = 'highly-skilled' | 'permanent-residence' | 'rental'
export type AnalyticsEvent =
  | { type: 'tool_view'; toolId: ToolId }
  | { type: 'tool_complete'; toolId: ToolId }

// Placeholder usage tracking: events are captured here so call sites don't need
// to change once a real endpoint exists, but nothing is persisted yet.
export function trackEvent(event: AnalyticsEvent) {
  if (import.meta.env.DEV) console.debug('[analytics]', event)
}
