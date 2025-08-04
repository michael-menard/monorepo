import { z } from 'zod'
import { config } from '../config/environment.js'

// Zod schemas for offline data
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
  private readonly OFFLINE_ACTIONS_KEY = 'offline_actions'
  private readonly OFFLINE_DATA_KEY = 'offline_data'
  private readonly MAX_RETRY_COUNT = 3
  private readonly DATA_VERSION = '1.0.0'

  constructor() {
    this.initializeOfflineData()
  }

  private initializeOfflineData(): void {
    const stored = localStorage.getItem(this.OFFLINE_DATA_KEY)
    if (!stored) {
      const initialData: OfflineData = {
        version: this.DATA_VERSION,
        lastSync: Date.now(),
        data: {},
      }
      this.setOfflineData(initialData)
    }
  }

  // Store data for offline access
  async storeData(key: string, data: any): Promise<void> {
    try {
      const offlineData = this.getOfflineData()
      offlineData.data[key] = {
        data,
        timestamp: Date.now(),
      }
      this.setOfflineData(offlineData)
    } catch (error) {
      console.error('Failed to store offline data:', error)
    }
  }

  // Retrieve data for offline access
  async getStoredData(key: string): Promise<any | null> {
    try {
      const offlineData = this.getOfflineData()
      const stored = offlineData.data[key]
      return stored ? stored.data : null
    } catch (error) {
      console.error('Failed to retrieve offline data:', error)
      return null
    }
  }

  // Queue an action for later synchronization
  async queueAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    try {
      const actions = this.getOfflineActions()
      const newAction: OfflineAction = {
        ...action,
        id: this.generateId(),
        timestamp: Date.now(),
        retryCount: 0,
      }
      actions.push(newAction)
      this.setOfflineActions(actions)
    } catch (error) {
      console.error('Failed to queue offline action:', error)
    }
  }

  // Process queued actions when online
  async processQueuedActions(): Promise<void> {
    if (!navigator.onLine) {
      return
    }

    const actions = this.getOfflineActions()
    if (actions.length === 0) {
      return
    }

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
    this.setOfflineActions(failedActions)

    // Update last sync time
    const offlineData = this.getOfflineData()
    offlineData.lastSync = Date.now()
    this.setOfflineData(offlineData)

    console.log(`Processed ${processedActions.length} offline actions, ${failedActions.length} failed`)
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

  // Check if we have pending offline actions
  hasPendingActions(): boolean {
    return this.getOfflineActions().length > 0
  }

  // Get count of pending actions
  getPendingActionCount(): number {
    return this.getOfflineActions().length
  }

  // Clear all offline data (useful for testing or reset)
  async clearOfflineData(): Promise<void> {
    try {
      localStorage.removeItem(this.OFFLINE_ACTIONS_KEY)
      localStorage.removeItem(this.OFFLINE_DATA_KEY)
      this.initializeOfflineData()
    } catch (error) {
      console.error('Failed to clear offline data:', error)
    }
  }

  // Get offline status information
  getOfflineStatus(): {
    isOnline: boolean
    pendingActions: number
    lastSync: number
    dataVersion: string
  } {
    const offlineData = this.getOfflineData()
    return {
      isOnline: navigator.onLine,
      pendingActions: this.getPendingActionCount(),
      lastSync: offlineData.lastSync,
      dataVersion: offlineData.version,
    }
  }

  // Private helper methods
  private getOfflineActions(): Array<OfflineAction> {
    try {
      const stored = localStorage.getItem(this.OFFLINE_ACTIONS_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Failed to get offline actions:', error)
      return []
    }
  }

  private setOfflineActions(actions: Array<OfflineAction>): void {
    try {
      localStorage.setItem(this.OFFLINE_ACTIONS_KEY, JSON.stringify(actions))
    } catch (error) {
      console.error('Failed to set offline actions:', error)
    }
  }

  private getOfflineData(): OfflineData {
    try {
      const stored = localStorage.getItem(this.OFFLINE_DATA_KEY)
      return stored ? JSON.parse(stored) : { version: this.DATA_VERSION, lastSync: Date.now(), data: {} }
    } catch (error) {
      console.error('Failed to get offline data:', error)
      return { version: this.DATA_VERSION, lastSync: Date.now(), data: {} }
    }
  }

  private setOfflineData(data: OfflineData): void {
    try {
      localStorage.setItem(this.OFFLINE_DATA_KEY, JSON.stringify(data))
    } catch (error) {
      console.error('Failed to set offline data:', error)
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

// Export singleton instance
export const offlineManager = new OfflineManager() 