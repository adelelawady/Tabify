export interface TabZenSettings {
  inactivityThreshold: number // in minutes
  excludePinnedTabs: boolean
  excludedDomains: string[]
  theme: 'light' | 'dark'
  autoPinEnabled: boolean
  showStats: boolean
  showInactivityTime: boolean
}

export const DEFAULT_SETTINGS: TabZenSettings = {
  inactivityThreshold: 10,
  excludePinnedTabs: true,
  excludedDomains: [],
  theme: 'light',
  autoPinEnabled: true,
  showStats: true,
  showInactivityTime: true
} 