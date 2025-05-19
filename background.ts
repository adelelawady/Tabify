import type { TabZenSettings } from "~types/settings"
import { updateTabActivity, shouldAutoPin, groupInactiveTabs } from "~utils/tabActivity"

let settings: TabZenSettings = {
  inactivityThreshold: 10,
  excludePinnedTabs: true,
  excludedDomains: [],
  theme: 'light',
  autoPinEnabled: true,
  showStats: true,
  showInactivityTime: true
}

// Load settings from storage
chrome.storage.sync.get("tabZenSettings", (result) => {
  if (result.tabZenSettings) {
    settings = result.tabZenSettings
  }
})

// Listen for settings changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.tabZenSettings) {
    settings = changes.tabZenSettings.newValue
  }
})

// Track tab activity
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await updateTabActivity(activeInfo.tabId)
})

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (changeInfo.status === 'complete') {
    await updateTabActivity(tabId)
  }
})

// Update activity when window is focused
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId !== chrome.windows.WINDOW_ID_NONE) {
    const tabs = await chrome.tabs.query({ active: true, windowId })
    if (tabs[0]?.id) {
      await updateTabActivity(tabs[0].id)
    }
  }
})

// Handle tab removal
chrome.tabs.onRemoved.addListener((tabId) => {
  // Remove from activity tracking
  chrome.storage.local.get(['tabActivity'], (result) => {
    const activity = result.tabActivity || {}
    delete activity[tabId]
    chrome.storage.local.set({ tabActivity: activity })
  })
})

// Check for inactive tabs periodically
setInterval(async () => {
  if (!settings.autoPinEnabled) return

  const tabs = await chrome.tabs.query({})
  const formattedTabs = tabs.map(tab => ({
    id: tab.id,
    title: tab.title,
    url: tab.url,
    pinned: tab.pinned || false,
    groupId: tab.groupId
  }))

  // Group inactive tabs
  await groupInactiveTabs(formattedTabs, settings)

  // Pin inactive tabs if enabled
  for (const tab of formattedTabs) {
    if (tab.id && tab.url && tab.title) {
      if (await shouldAutoPin(tab, settings)) {
        chrome.tabs.update(tab.id, { pinned: true })
      }
    }
  }
}, 60000) // Check every minute 