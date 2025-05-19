import type { Tab } from "~types/tab"
import type { TabZenSettings } from "~types/settings"

interface TabActivity {
  lastActive: number
  isPinned: boolean
}

// Store tab activity in chrome.storage.local for persistence
const getTabActivity = async (): Promise<Record<number, TabActivity>> => {
  const result = await chrome.storage.local.get('tabActivity')
  return result.tabActivity || {}
}

const setTabActivity = async (tabId: number, activity: TabActivity) => {
  const activities = await getTabActivity()
  activities[tabId] = activity
  await chrome.storage.local.set({ tabActivity: activities })
}

export const updateTabActivity = async (tabId: number) => {
  await setTabActivity(tabId, {
    lastActive: Date.now(),
    isPinned: false
  })
}

export const getTabInactivityDuration = async (tabId: number): Promise<number> => {
  const activities = await getTabActivity()
  const activity = activities[tabId]
  if (!activity) return 0
  return (Date.now() - activity.lastActive) / (1000 * 60) // Convert to minutes
}

export const shouldAutoPin = async (tab: Tab, settings: TabZenSettings): Promise<boolean> => {
  if (!settings.autoPinEnabled) return false
  if (tab.pinned && settings.excludePinnedTabs) return false
  
  const domain = new URL(tab.url).hostname
  if (settings.excludedDomains.includes(domain)) return false
  
  const inactivityDuration = await getTabInactivityDuration(tab.id)
  return inactivityDuration >= settings.inactivityThreshold
}

export const getTabStats = async (tabs: Tab[]): Promise<{ total: number; inactive: number }> => {
  return {
    total: tabs.length,
    inactive: tabs.filter(tab => tab.pinned).length
  }
}

export const groupInactiveTabs = async (tabs: Tab[], settings: TabZenSettings) => {
  // Get inactive tabs
  const inactiveTabs = await Promise.all(
    tabs.map(async tab => {
      const inactivityDuration = await getTabInactivityDuration(tab.id)
      return {
        tab,
        inactivityDuration
      }
    })
  )

  const tabsToGroup = inactiveTabs
    .filter(({ tab, inactivityDuration }) => 
      inactivityDuration >= settings.inactivityThreshold && !tab.pinned
    )
    .map(({ tab }) => tab)

  if (tabsToGroup.length > 0) {
    // Create a new group
    const group = await chrome.tabs.group({
      tabIds: tabsToGroup.map(tab => tab.id)
    })

    // Update the group's title and color
    await chrome.tabGroups.update(group, {
      title: "Inactive Tabs",
      color: "grey"
    })
  }
}

export const closeInactiveTabs = async (tabs: Tab[], settings: TabZenSettings) => {
  const inactiveTabs = await Promise.all(
    tabs.map(async tab => {
      const inactivityDuration = await getTabInactivityDuration(tab.id)
      return {
        tab,
        inactivityDuration
      }
    })
  )

  const tabsToClose = inactiveTabs
    .filter(({ tab, inactivityDuration }) => 
      inactivityDuration >= settings.inactivityThreshold && !tab.pinned
    )
    .map(({ tab }) => tab.id)

  if (tabsToClose.length > 0) {
    await chrome.tabs.remove(tabsToClose)
  }
} 