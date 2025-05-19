import type { TabZenSettings } from "~types/settings"
import { updateTabActivity, shouldAutoPin } from "~utils/tabActivity"

let settings: TabZenSettings = {
  inactivityThreshold: 10,
  excludePinnedTabs: true,
  excludedDomains: [],
  theme: 'light',
  autoPinEnabled: true,
  showStats: true
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
chrome.tabs.onActivated.addListener((activeInfo) => {
  updateTabActivity(activeInfo.tabId)
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete') {
    updateTabActivity(tabId)
  }
})

// Check for inactive tabs periodically
setInterval(async () => {
  if (!settings.autoPinEnabled) return

  const tabs = await chrome.tabs.query({})
  for (const tab of tabs) {
    if (tab.id && tab.url && tab.title) {
      const formattedTab = {
        id: tab.id,
        title: tab.title,
        url: tab.url,
        pinned: tab.pinned || false,
        groupId: tab.groupId
      }
      if (shouldAutoPin(formattedTab, settings)) {
        chrome.tabs.update(tab.id, { pinned: true })
      }
    }
  }
}, 60000) // Check every minute 