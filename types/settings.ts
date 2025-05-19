export interface TabZenSettings {
  inactivityThreshold: number // in minutes
  excludePinnedTabs: boolean
  excludedDomains: string[]
  theme: 'light' | 'dark'
  autoPinEnabled: boolean
  showStats: boolean
  showInactivityTime: boolean
  groupName: string
  groupAction: 'pin' | 'group' | 'both'
}

export const DEFAULT_SETTINGS: TabZenSettings = {
  inactivityThreshold: 10,
  excludePinnedTabs: true,
  excludedDomains: [],
  theme: 'light',
  autoPinEnabled: true,
  showStats: true,
  showInactivityTime: true,
  groupName: "Inactive Tabs",
  groupAction: 'both'
} 