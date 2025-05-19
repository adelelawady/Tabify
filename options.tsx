import { useState, useEffect } from "react"
import type { TabZenSettings } from "~types/settings"
import { DEFAULT_SETTINGS } from "~types/settings"
import "~style.css"

function OptionsPage() {
  const [settings, setSettings] = useState<TabZenSettings>(DEFAULT_SETTINGS)
  const [newDomain, setNewDomain] = useState("")

  useEffect(() => {
    // Load settings from storage
    chrome.storage.sync.get("tabZenSettings", (result) => {
      if (result.tabZenSettings) {
        setSettings(result.tabZenSettings)
      }
    })
  }, [])

  const saveSettings = async (newSettings: TabZenSettings) => {
    await chrome.storage.sync.set({ tabZenSettings: newSettings })
    setSettings(newSettings)
  }

  const addExcludedDomain = () => {
    if (newDomain && !settings.excludedDomains.includes(newDomain)) {
      const updatedSettings = {
        ...settings,
        excludedDomains: [...settings.excludedDomains, newDomain]
      }
      saveSettings(updatedSettings)
      setNewDomain("")
    }
  }

  const removeExcludedDomain = (domain: string) => {
    const updatedSettings = {
      ...settings,
      excludedDomains: settings.excludedDomains.filter(d => d !== domain)
    }
    saveSettings(updatedSettings)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">TabZen Settings</h1>
        
        <div className="space-y-6">
          {/* Inactivity Threshold */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Inactivity Threshold</h2>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="1"
                max="60"
                value={settings.inactivityThreshold}
                onChange={(e) => saveSettings({
                  ...settings,
                  inactivityThreshold: parseInt(e.target.value)
                })}
                className="w-full"
              />
              <span className="text-lg font-medium">
                {settings.inactivityThreshold} minutes
              </span>
            </div>
          </div>

          {/* Auto-Pin Settings */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Auto-Pin Settings</h2>
            <div className="space-y-4">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={settings.autoPinEnabled}
                  onChange={(e) => saveSettings({
                    ...settings,
                    autoPinEnabled: e.target.checked
                  })}
                  className="form-checkbox h-5 w-5"
                />
                <span>Enable auto-pinning</span>
              </label>
              
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={settings.excludePinnedTabs}
                  onChange={(e) => saveSettings({
                    ...settings,
                    excludePinnedTabs: e.target.checked
                  })}
                  className="form-checkbox h-5 w-5"
                />
                <span>Exclude already pinned tabs</span>
              </label>
            </div>
          </div>

          {/* Excluded Domains */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Excluded Domains</h2>
            <div className="space-y-4">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="Enter domain (e.g., youtube.com)"
                  className="flex-1 p-2 border rounded"
                />
                <button
                  onClick={addExcludedDomain}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                  Add
                </button>
              </div>
              
              <div className="space-y-2">
                {settings.excludedDomains.map(domain => (
                  <div key={domain} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span>{domain}</span>
                    <button
                      onClick={() => removeExcludedDomain(domain)}
                      className="text-red-500 hover:text-red-700">
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Theme Settings */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Theme</h2>
            <div className="flex space-x-4">
              <button
                onClick={() => saveSettings({ ...settings, theme: 'light' })}
                className={`px-4 py-2 rounded ${
                  settings.theme === 'light'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200'
                }`}>
                Light
              </button>
              <button
                onClick={() => saveSettings({ ...settings, theme: 'dark' })}
                className={`px-4 py-2 rounded ${
                  settings.theme === 'dark'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200'
                }`}>
                Dark
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OptionsPage 