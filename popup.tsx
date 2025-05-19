import { useState, useEffect } from "react"
import type { Tab } from "~types/tab"
import type { TabZenSettings } from "~types/settings"
import { DEFAULT_SETTINGS } from "~types/settings"
import { getTabStats, getTabInactivityDuration, groupInactiveTabs, closeInactiveTabs, updateTabActivity } from "~utils/tabActivity"
import "~style.css"

function IndexPopup() {
  const [tabs, setTabs] = useState<Tab[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [settings, setSettings] = useState<TabZenSettings>(DEFAULT_SETTINGS)
  const [stats, setStats] = useState({ total: 0, inactive: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [inactivityTimes, setInactivityTimes] = useState<Record<number, number>>({})

  useEffect(() => {
    loadTabs()
    loadSettings()
  }, [])

  useEffect(() => {
    const updateTimes = async () => {
      const times: Record<number, number> = {}
      for (const tab of tabs) {
        times[tab.id] = await getTabInactivityDuration(tab.id)
      }
      setInactivityTimes(times)
    }

    updateTimes()
    const interval = setInterval(updateTimes, 10000)
    return () => clearInterval(interval)
  }, [tabs])

  const loadSettings = async () => {
    const result = await chrome.storage.sync.get("tabZenSettings")
    if (result.tabZenSettings) {
      setSettings(result.tabZenSettings)
    }
  }

  const loadTabs = async () => {
    setIsLoading(true)
    try {
      const chromeTabs = await chrome.tabs.query({})
      const formattedTabs = chromeTabs.map(tab => ({
        id: tab.id,
        title: tab.title,
        url: tab.url,
        pinned: tab.pinned,
        groupId: tab.groupId
      }))
      setTabs(formattedTabs)
      const newStats = await getTabStats(formattedTabs)
      setStats(newStats)
    } catch (error) {
      console.error("Error loading tabs:", error)
    }
    setIsLoading(false)
  }

  const filteredTabs = tabs.filter(tab =>
    tab.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handlePinAllInactive = async () => {
    const inactiveTabs = await Promise.all(
      tabs.map(async tab => {
        const inactivityDuration = await getTabInactivityDuration(tab.id)
        return {
          tab,
          inactivityDuration
        }
      })
    )

    const tabsToPin = inactiveTabs
      .filter(({ inactivityDuration }) => inactivityDuration >= settings.inactivityThreshold)
      .map(({ tab }) => tab)

    for (const tab of tabsToPin) {
      if (!tab.pinned) {
        await chrome.tabs.update(tab.id, { pinned: true })
      }
    }
    loadTabs()
  }

  const handleUnpinAll = async () => {
    const pinnedTabs = tabs.filter(tab => tab.pinned)
    for (const tab of pinnedTabs) {
      await chrome.tabs.update(tab.id, { pinned: false })
    }
    loadTabs()
  }

  const handleCloseInactive = async () => {
    await closeInactiveTabs(tabs, settings)
    loadTabs()
  }

  const handleCloseTab = async (tabId: number) => {
    try {
      await chrome.tabs.remove(tabId)
      setTabs(tabs.filter(tab => tab.id !== tabId))
    } catch (error) {
      console.error("Error closing tab:", error)
    }
  }

  const handlePinTab = async (tabId: number, pinned: boolean) => {
    try {
      await chrome.tabs.update(tabId, { pinned })
      setTabs(tabs.map(tab =>
        tab.id === tabId ? { ...tab, pinned } : tab
      ))
    } catch (error) {
      console.error("Error pinning tab:", error)
    }
  }

  const handleOpenTab = async (tabId: number) => {
    try {
      await chrome.tabs.update(tabId, { active: true })
      // Update the activity when opening the tab
      await updateTabActivity(tabId)
    } catch (error) {
      console.error("Error opening tab:", error)
    }
  }

  const openSettings = () => {
    chrome.runtime.openOptionsPage()
  }

  const formatInactivityTime = (minutes: number): string => {
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${Math.round(minutes)}m ago`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = Math.round(minutes % 60)
    return `${hours}h ${remainingMinutes}m ago`
  }

  const handleExcludeDomain = async (url: string) => {
    try {
      const domain = new URL(url).hostname
      const result = await chrome.storage.sync.get("tabZenSettings")
      const currentSettings = result.tabZenSettings || DEFAULT_SETTINGS
      
      if (!currentSettings.excludedDomains.includes(domain)) {
        const updatedSettings = {
          ...currentSettings,
          excludedDomains: [...currentSettings.excludedDomains, domain]
        }
        await chrome.storage.sync.set({ tabZenSettings: updatedSettings })
        setSettings(updatedSettings)
      }
    } catch (error) {
      console.error("Error excluding domain:", error)
    }
  }

  const handleRemoveExcludedDomain = async (domain: string) => {
    try {
      const result = await chrome.storage.sync.get("tabZenSettings")
      const currentSettings = result.tabZenSettings || DEFAULT_SETTINGS
      
      const updatedSettings = {
        ...currentSettings,
        excludedDomains: currentSettings.excludedDomains.filter(d => d !== domain)
      }
      await chrome.storage.sync.set({ tabZenSettings: updatedSettings })
      setSettings(updatedSettings)
    } catch (error) {
      console.error("Error removing excluded domain:", error)
    }
  }

  const isDomainExcluded = (url: string): boolean => {
    try {
      const domain = new URL(url).hostname
      return settings.excludedDomains.includes(domain)
    } catch {
      return false
    }
  }

  return (
    <div className={`w-[400px] p-4 ${settings.theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white'}`}>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">TabZen</h1>
        <button
          onClick={openSettings}
          className="text-blue-500 hover:text-blue-600">
          ⚙️ Settings
        </button>
      </div>

      {settings.showStats && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className={`p-3 rounded-lg ${settings.theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <div className="text-sm text-gray-500">Total Tabs</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </div>
          <div className={`p-3 rounded-lg ${settings.theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <div className="text-sm text-gray-500">Pinned Tabs</div>
            <div className="text-2xl font-bold">{stats.inactive}</div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="Search tabs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`flex-1 p-2 rounded border ${
              settings.theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white'
            }`}
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={handlePinAllInactive}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            Pin All
          </button>
          <button
            onClick={handleUnpinAll}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600">
            Unpin All
          </button>
          <button
            onClick={handleCloseInactive}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
            Close
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-4">Loading tabs...</div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {filteredTabs.map(tab => (
              <div
                key={tab.id}
                className={`flex items-center justify-between p-2 rounded ${
                  settings.theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100'
                }`}>
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  {tab.pinned && <span>📌</span>}
                  <div 
                    className="flex flex-col min-w-0 cursor-pointer hover:underline"
                    onClick={() => handleOpenTab(tab.id)}>
                    <span className="truncate">{tab.title}</span>
                    {settings.showInactivityTime && (
                      <span className={`text-xs ${settings.theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {formatInactivityTime(inactivityTimes[tab.id] || 0)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2 ml-2">
                  <button
                    onClick={() => handlePinTab(tab.id, !tab.pinned)}
                    className="text-gray-500 hover:text-gray-700">
                    {tab.pinned ? "Unpin" : "Pin"}
                  </button>
                  {isDomainExcluded(tab.url) ? (
                    <button
                      onClick={() => handleRemoveExcludedDomain(new URL(tab.url).hostname)}
                      className="text-purple-500 hover:text-purple-700"
                      title="Remove from excluded domains">
                      🚫
                    </button>
                  ) : (
                    <button
                      onClick={() => handleExcludeDomain(tab.url)}
                      className="text-purple-500 hover:text-purple-700"
                      title="Exclude domain from auto-pinning">
                      ⭐
                    </button>
                  )}
                  <button
                    onClick={() => handleCloseTab(tab.id)}
                    className="text-red-500 hover:text-red-700">
                    Close
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default IndexPopup
