/**
 * Observer Pattern: Event system for monitoring and extending MCP server functionality
 */

import { logInfo, logError } from '../../logging/logger'

export interface IEventListener<T = any> {
  handle(event: Event<T>): Promise<void> | void
}

export interface Event<T = any> {
  type: string
  data: T
  timestamp: Date
  source: string
  id: string
  metadata?: Record<string, unknown>
}

export interface EventSubscription {
  id: string
  eventType: string
  listener: IEventListener
  priority: number
  once: boolean
}

/**
 * Event emitter with advanced features
 */
export class EventSystem {
  private listeners: Map<string, EventSubscription[]> = new Map()
  private eventHistory: Event[] = []
  private maxHistorySize = 1000
  private globalListeners: EventSubscription[] = []

  /**
   * Subscribe to events of a specific type
   */
  on<T>(
    eventType: string, 
    listener: IEventListener<T>, 
    options: { priority?: number; once?: boolean } = {}
  ): string {
    const subscription: EventSubscription = {
      id: this.generateSubscriptionId(),
      eventType,
      listener,
      priority: options.priority || 0,
      once: options.once || false
    }

    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, [])
    }

    const eventListeners = this.listeners.get(eventType)!
    eventListeners.push(subscription)
    
    // Sort by priority (higher priority first)
    eventListeners.sort((a, b) => b.priority - a.priority)

    logInfo('Event listener registered', {
      subscriptionId: subscription.id,
      eventType,
      priority: subscription.priority,
      once: subscription.once
    })

    return subscription.id
  }

  /**
   * Subscribe to events once
   */
  once<T>(eventType: string, listener: IEventListener<T>, priority = 0): string {
    return this.on(eventType, listener, { priority, once: true })
  }

  /**
   * Subscribe to all events (global listener)
   */
  onAll(listener: IEventListener, priority = 0): string {
    const subscription: EventSubscription = {
      id: this.generateSubscriptionId(),
      eventType: '*',
      listener,
      priority,
      once: false
    }

    this.globalListeners.push(subscription)
    this.globalListeners.sort((a, b) => b.priority - a.priority)

    logInfo('Global event listener registered', {
      subscriptionId: subscription.id,
      priority
    })

    return subscription.id
  }

  /**
   * Unsubscribe from events
   */
  off(subscriptionId: string): boolean {
    // Check specific event listeners
    for (const [eventType, listeners] of this.listeners.entries()) {
      const index = listeners.findIndex(sub => sub.id === subscriptionId)
      if (index > -1) {
        listeners.splice(index, 1)
        if (listeners.length === 0) {
          this.listeners.delete(eventType)
        }
        logInfo('Event listener unregistered', { subscriptionId, eventType })
        return true
      }
    }

    // Check global listeners
    const globalIndex = this.globalListeners.findIndex(sub => sub.id === subscriptionId)
    if (globalIndex > -1) {
      this.globalListeners.splice(globalIndex, 1)
      logInfo('Global event listener unregistered', { subscriptionId })
      return true
    }

    return false
  }

  /**
   * Emit an event
   */
  async emit<T>(eventType: string, data: T, source = 'unknown', metadata?: Record<string, unknown>): Promise<void> {
    const event: Event<T> = {
      type: eventType,
      data,
      timestamp: new Date(),
      source,
      id: this.generateEventId(),
      metadata
    }

    // Add to history
    this.addToHistory(event)

    logInfo('Event emitted', {
      eventId: event.id,
      eventType,
      source,
      hasMetadata: !!metadata
    })

    // Notify specific listeners
    const specificListeners = this.listeners.get(eventType) || []
    await this.notifyListeners(specificListeners, event)

    // Notify global listeners
    await this.notifyListeners(this.globalListeners, event)
  }

  /**
   * Emit event synchronously (fire and forget)
   */
  emitSync<T>(eventType: string, data: T, source = 'unknown', metadata?: Record<string, unknown>): void {
    this.emit(eventType, data, source, metadata).catch(error => {
      logError('Async event emission failed', error, {
        eventType,
        source
      })
    })
  }

  /**
   * Get event history
   */
  getHistory(eventType?: string, limit?: number): Event[] {
    let history = this.eventHistory

    if (eventType) {
      history = history.filter(event => event.type === eventType)
    }

    if (limit) {
      history = history.slice(-limit)
    }

    return [...history]
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = []
    logInfo('Event history cleared')
  }

  /**
   * Get active subscriptions
   */
  getSubscriptions(): { eventType: string; count: number }[] {
    const subscriptions: { eventType: string; count: number }[] = []

    for (const [eventType, listeners] of this.listeners.entries()) {
      subscriptions.push({ eventType, count: listeners.length })
    }

    if (this.globalListeners.length > 0) {
      subscriptions.push({ eventType: '*', count: this.globalListeners.length })
    }

    return subscriptions
  }

  /**
   * Remove all listeners for an event type
   */
  removeAllListeners(eventType?: string): void {
    if (eventType) {
      this.listeners.delete(eventType)
      logInfo('All listeners removed for event type', { eventType })
    } else {
      this.listeners.clear()
      this.globalListeners = []
      logInfo('All event listeners removed')
    }
  }

  /**
   * Notify listeners of an event
   */
  private async notifyListeners(listeners: EventSubscription[], event: Event): Promise<void> {
    const promises: Promise<void>[] = []

    for (const subscription of listeners) {
      promises.push(this.notifyListener(subscription, event))
    }

    await Promise.allSettled(promises)
  }

  /**
   * Notify a single listener
   */
  private async notifyListener(subscription: EventSubscription, event: Event): Promise<void> {
    try {
      await subscription.listener.handle(event)

      // Remove one-time listeners
      if (subscription.once) {
        this.off(subscription.id)
      }

    } catch (error) {
      logError('Event listener error', error as Error, {
        subscriptionId: subscription.id,
        eventType: subscription.eventType,
        eventId: event.id
      })
    }
  }

  /**
   * Add event to history
   */
  private addToHistory(event: Event): void {
    this.eventHistory.push(event)

    // Maintain history size limit
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift()
    }
  }

  /**
   * Generate unique subscription ID
   */
  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

/**
 * Predefined event types for the MCP server
 */
export enum MCPEventType {
  // Server events
  SERVER_STARTED = 'server.started',
  SERVER_STOPPED = 'server.stopped',
  SERVER_ERROR = 'server.error',

  // Tool events
  TOOL_EXECUTED = 'tool.executed',
  TOOL_FAILED = 'tool.failed',
  TOOL_REGISTERED = 'tool.registered',

  // Memory events
  MEMORY_CREATED = 'memory.created',
  MEMORY_UPDATED = 'memory.updated',
  MEMORY_DELETED = 'memory.deleted',
  MEMORY_ACCESSED = 'memory.accessed',

  // Cache events
  CACHE_HIT = 'cache.hit',
  CACHE_MISS = 'cache.miss',
  CACHE_EVICTION = 'cache.eviction',

  // Performance events
  SLOW_OPERATION = 'performance.slow',
  HIGH_MEMORY_USAGE = 'performance.memory.high',
  
  // Security events
  UNAUTHORIZED_ACCESS = 'security.unauthorized',
  SUSPICIOUS_ACTIVITY = 'security.suspicious'
}

/**
 * Built-in event listeners
 */
export class PerformanceMonitorListener implements IEventListener {
  private slowOperationThreshold = 1000 // 1 second

  async handle(event: Event): Promise<void> {
    if (event.type === MCPEventType.TOOL_EXECUTED) {
      const duration = event.metadata?.duration as number
      
      if (duration && duration > this.slowOperationThreshold) {
        // Emit slow operation event
        eventSystem.emitSync(MCPEventType.SLOW_OPERATION, {
          toolName: event.data.toolName,
          duration,
          threshold: this.slowOperationThreshold
        }, 'performance-monitor')
      }
    }
  }
}

export class SecurityMonitorListener implements IEventListener {
  async handle(event: Event): Promise<void> {
    if (event.type === MCPEventType.TOOL_FAILED) {
      const error = event.data.error as string
      
      if (error.includes('unauthorized') || error.includes('forbidden')) {
        eventSystem.emitSync(MCPEventType.UNAUTHORIZED_ACCESS, {
          toolName: event.data.toolName,
          error,
          source: event.source
        }, 'security-monitor')
      }
    }
  }
}

/**
 * Global event system instance
 */
export const eventSystem = new EventSystem()

// Register built-in listeners
eventSystem.onAll(new PerformanceMonitorListener(), 100)
eventSystem.onAll(new SecurityMonitorListener(), 100)
