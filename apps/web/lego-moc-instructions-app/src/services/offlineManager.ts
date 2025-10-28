import { z } from 'zod'
import { config } from '../config/environment.js'
import {
  idbAddAction,
  idbClearActions,
  idbDeleteData,
  idbGetAllActions,
  idbGetData,
  idbGetLastSync,
  idbSetActions,
  idbSetData,
  idbSetLastSync,
  isIDBAvailable,
} from './idbQueue'
import type { IDBAction } from './idbQueue'

/**
 * Zod schemas for offline data
 */
export const OfflineActionSchema = z.object({
  id: z.string(),
  type: z.enum(['create', 'update', 'delete']),
  endpoint: z.string(),
  data: z.any(),
  timestamp: z.number(),
  retryCount: z.number().default(0),
})

export const OfflineDataSchema = z.object({
  version: z.string(),
  lastSync: z.number(),
  data: z.record(z.any()),
})

export type OfflineAction = z.infer<typeof OfflineActionSchema>
export type OfflineData = z.infer<typeof OfflineDataSchema>

class OfflineManager {
  private readonly OFFLINE_ACTIONS_KEY = 'offline_actions' // used only for localStorage fallback
  private readonly OFFLINE_DATA_KEY = 'offline_data' // used only for localStorage fallback
  private readonly MAX_RETRY_COUNT = 3
  private readonly DATA_VERSION = '1.0.0'

  constructor() {
    // Initialize metadata if needed (only for localStorage fallback)
    if (!isIDBAvailable()) {
      this.initializeOfflineDataLocal()
    }

    // Set up background sync: automatically sync when network comes back online
    this.setupBackgroundSync()
  }

  private setupBackgroundSync(): void {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnlineEvent.bind(this))
    window.addEventListener('offline', this.handleOfflineEvent.bind(this))

    // Also listen for visibility change to sync when app becomes visible
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this))
  }

  private handleOnlineEvent(): void {
    console.log('Network came back online, attempting to sync pending actions...')
    this.processQueuedActions().catch(error => {
      console.error('Auto-sync failed when network came online:', error)
    })
  }

  private handleOfflineEvent(): void {
    console.log('Network went offline, queued actions will be synced when reconnected')
  }

  private handleVisibilityChange(): void {
    // Sync when app becomes visible and we're online
    if (!document.hidden && navigator.onLine) {
      this.processQueuedActions().catch(error => {
        console.error('Auto-sync failed on visibility change:', error)
      })
    }
  }

  private initializeOfflineDataLocal(): void {
    const stored = localStorage.getItem(this.OFFLINE_DATA_KEY)
    if (!stored) {
      const initialData: OfflineData = {
        version: this.DATA_VERSION,
        lastSync: Date.now(),
        data: {},
      }
      this.setOfflineDataLocal(initialData)
    }
  }

  /* =========================
   * Data (metadata) helpers
   * ========================= */

  private async getOfflineData(): Promise<OfflineData> {
    if (isIDBAvailable()) {
      const version = (await idbGetData<string>('version')) ?? this.DATA_VERSION
      const lastSync = (await idbGetLastSync()) ?? Date.now()
      const data = (await idbGetData<Record<string, any>>('data')) ?? {}
      return { version, lastSync, data }
    } else {
      try {
        const stored = localStorage.getItem(this.OFFLINE_DATA_KEY)
        return stored
          ? JSON.parse(stored)
          : { version: this.DATA_VERSION, lastSync: Date.now(), data: {} }
      } catch {
        return { version: this.DATA_VERSION, lastSync: Date.now(), data: {} }
      }
    }
  }

  private async setOfflineData(data: OfflineData): Promise<void> {
    if (isIDBAvailable()) {
      await idbSetData('version', data.version)
      await idbSetLastSync(data.lastSync)
      await idbSetData('data', data.data)
    } else {
      this.setOfflineDataLocal(data)
    }
  }

  private setOfflineDataLocal(data: OfflineData): void {
    try {
      localStorage.setItem(this.OFFLINE_DATA_KEY, JSON.stringify(data))
    } catch (error) {
      console.error('Failed to set offline data:', error)
    }
  }

  /* =========================
   * Public API (data storage)
   * ========================= */

  // Store data for offline access
  async storeData(key: string, data: any): Promise<void> {
    try {
      if (isIDBAvailable()) {
        const offlineData = await this.getOfflineData()
        offlineData.data[key] = { data, timestamp: Date.now() }
        await this.setOfflineData(offlineData)
      } else {
        const offlineData = await this.getOfflineData()
        offlineData.data[key] = { data, timestamp: Date.now() }
        this.setOfflineDataLocal(offlineData)
      }
    } catch (error) {
      console.error('Failed to store offline data:', error)
    }
  }

  // Retrieve data for offline access
  async getStoredData(key: string): Promise<any | null> {
    try {
      const offlineData = await this.getOfflineData()
      const stored = offlineData.data[key]
      return stored ? stored.data : null
    } catch (error) {
      console.error('Failed to retrieve offline data:', error)
      return null
    }
  }

  /* =========================
   * Queue operations
   * ========================= */

  // Queue an action for later synchronization
  async queueAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    try {
      const newAction: OfflineAction = {
        ...action,
        id: this.generateId(),
        timestamp: Date.now(),
        retryCount: 0,
      }
      if (isIDBAvailable()) {
        await idbAddAction(newAction as IDBAction)
      } else {
        const actions = this.getOfflineActionsLocal()
        actions.push(newAction)
        this.setOfflineActionsLocal(actions)
      }
    } catch (error) {
      console.error('Failed to queue offline action:', error)
    }
  }

  // Process queued actions when online
  async processQueuedActions(): Promise<void> {
    if (!navigator.onLine) return

    const actions = await this.getOfflineActions()
    if (actions.length === 0) return

    const processedActions: Array<OfflineAction> = []
    const failedActions: Array<OfflineAction> = []

    for (const action of actions) {
      try {
        await this.processAction(action)
        processedActions.push(action)
      } catch (error) {
        console.error('Failed to process action:', action, error)
        if (action.retryCount < this.MAX_RETRY_COUNT) {
          action.retryCount++
          failedActions.push(action)
        }
      }
    }

    // Update the queue with failed actions
    await this.setOfflineActions(failedActions)

    // Update last sync time
    const offlineData = await this.getOfflineData()
    offlineData.lastSync = Date.now()
    await this.setOfflineData(offlineData)

    console.log(
      `Processed ${processedActions.length} offline actions, ${failedActions.length} failed`,
    )
  }

  // Process a single action using fetch with proper headers and base URL
  private async processAction(action: OfflineAction): Promise<void> {
    const { type, endpoint, data } = action

    // Construct the full URL using the API base URL
    const fullUrl = `${config.api.baseUrl}${endpoint}`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Add auth token if available
    const token = localStorage.getItem('authToken')
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const requestOptions: RequestInit = {
      method: this.getMethodForAction(type),
      headers,
    }

    if (data && ['POST', 'PUT', 'PATCH'].includes(requestOptions.method!)) {
      requestOptions.body = JSON.stringify(data)
    }

    const response = await fetch(fullUrl, requestOptions)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
  }

  // Get HTTP method for action type
  private getMethodForAction(type: OfflineAction['type']): string {
    switch (type) {
      case 'create':
        return 'POST'
      case 'update':
        return 'PUT'
      case 'delete':
        return 'DELETE'
      default:
        return 'POST'
    }
  }

  /* =========================
   * Status & maintenance
   * ========================= */

  // Async offline status with real queue depth / last sync
  async getOfflineStatusAsync(): Promise<{
    isOnline: boolean
    pendingActions: number
    lastSync: number
    dataVersion: string
  }> {
    const offlineData = await this.getOfflineData()
    const pending = await this.getPendingActionCountAsync()
    return {
      isOnline: navigator.onLine,
      pendingActions: pending,
      lastSync: offlineData.lastSync,
      dataVersion: offlineData.version,
    }
  }

  // Sync compatibility method (uses last known local values; prefer async)
  getOfflineStatus(): {
    isOnline: boolean
    pendingActions: number
    lastSync: number
    dataVersion: string
  } {
    const offlineData = (() => {
      try {
        const stored = localStorage.getItem(this.OFFLINE_DATA_KEY)
        return stored
          ? JSON.parse(stored)
          : { version: this.DATA_VERSION, lastSync: Date.now(), data: {} }
      } catch {
        return { version: this.DATA_VERSION, lastSync: Date.now(), data: {} }
      }
    })()

    return {
      isOnline: navigator.onLine,
      pendingActions: this.getPendingActionCountLocal(),
      lastSync: offlineData.lastSync,
      dataVersion: offlineData.version,
    }
  }

  async hasPendingActionsAsync(): Promise<boolean> {
    return (await this.getPendingActionCountAsync()) > 0
  }

  async getPendingActionCountAsync(): Promise<number> {
    if (isIDBAvailable()) {
      const actions = await idbGetAllActions()
      return actions.length
    } else {
      return this.getPendingActionCountLocal()
    }
  }

  hasPendingActions(): boolean {
    return this.getPendingActionCountLocal() > 0
  }

  getPendingActionCount(): number {
    return this.getPendingActionCountLocal()
  }

  private getPendingActionCountLocal(): number {
    return this.getOfflineActionsLocal().length
  }

  async clearOfflineData(): Promise<void> {
    try {
      if (isIDBAvailable()) {
        await idbClearActions()
        await idbDeleteData('data')
        await idbDeleteData('version')
        await idbDeleteData('lastSync')
        // Re-init version/lastSync
        await idbSetData('version', this.DATA_VERSION)
        await idbSetLastSync(Date.now())
      } else {
        localStorage.removeItem(this.OFFLINE_ACTIONS_KEY)
        localStorage.removeItem(this.OFFLINE_DATA_KEY)
        this.initializeOfflineDataLocal()
      }
    } catch (error) {
      console.error('Failed to clear offline data:', error)
    }
  }

  /* =========================
   * Private persistence helpers
   * ========================= */

  private async getOfflineActions(): Promise<Array<OfflineAction>> {
    if (isIDBAvailable()) {
      const items = await idbGetAllActions()
      // trust stored shape
      return items as Array<OfflineAction>
    } else {
      return this.getOfflineActionsLocal()
    }
  }

  private async setOfflineActions(actions: Array<OfflineAction>): Promise<void> {
    if (isIDBAvailable()) {
      await idbSetActions(actions as Array<IDBAction>)
    } else {
      this.setOfflineActionsLocal(actions)
    }
  }

  private getOfflineActionsLocal(): Array<OfflineAction> {
    try {
      const stored = localStorage.getItem(this.OFFLINE_ACTIONS_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Failed to get offline actions:', error)
      return []
    }
  }

  private setOfflineActionsLocal(actions: Array<OfflineAction>): void {
    try {
      localStorage.setItem(this.OFFLINE_ACTIONS_KEY, JSON.stringify(actions))
    } catch (error) {
      console.error('Failed to set offline actions:', error)
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

// Export singleton instance
export const offlineManager = new OfflineManager()
