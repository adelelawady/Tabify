import type { Tab } from "~types/tab"
import type { TabZenSettings } from "~types/settings"

interface TabActivity {
  lastActive: number
  isPinned: boolean
}

const tabActivityMap = new Map<number, TabActivity>()

export const updateTabActivity = (tabId: number) => {
  tabActivityMap.set(tabId, {
    lastActive: Date.now(),
    isPinned: false
  })
}

export const getTabInactivityDuration = (tabId: number): number => {
  const activity = tabActivityMap.get(tabId)
  if (!activity) return 0
  return (Date.now() - activity.lastActive) / (1000 * 60) // Convert to minutes
}

export const shouldAutoPin = (tab: Tab, settings: TabZenSettings): boolean => {
  if (!settings.autoPinEnabled) return false
  if (tab.pinned && settings.excludePinnedTabs) return false
  
  const domain = new URL(tab.url).hostname
  if (settings.excludedDomains.includes(domain)) return false
  
  const inactivityDuration = getTabInactivityDuration(tab.id)
  return inactivityDuration >= settings.inactivityThreshold
}

export const getTabStats = (tabs: Tab[]): { total: number; inactive: number } => {
  const now = Date.now()
  const inactiveThreshold = 10 * 60 * 1000 // 10 minutes in milliseconds
  
  return {
    total: tabs.length,
    inactive: tabs.filter(tab => {
      const activity = tabActivityMap.get(tab.id)
      return activity && (now - activity.lastActive) > inactiveThreshold
    }).length
  }
} 