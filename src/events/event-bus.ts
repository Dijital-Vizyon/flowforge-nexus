import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Event, Message } from '../types';
import { EventStore } from './event-store';

@Injectable()
export class EventBus implements OnModuleInit {
  private readonly logger = new Logger(EventBus.name);
  private readonly subscribers = new Map<string, Set<Function>>();

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly eventStore: EventStore,
  ) {}

  onModuleInit() {
    this.logger.log('EventBus initialized');
  }

  async publish<T = any>(event: Event<T>): Promise<void> {
    try {
      this.logger.debug(`Publishing event: ${event.type}`, { eventId: event.id });

      // Store event in event store
      await this.eventStore.storeEvent(event);

      // Emit event locally
      this.eventEmitter.emit(event.type, event);
      this.eventEmitter.emit('event.published', event);

      // Notify external subscribers
      await this.notifyExternalSubscribers(event);

      this.logger.debug(`Event published successfully: ${event.type}`, { eventId: event.id });
    } catch (error) {
      this.logger.error(`Failed to publish event ${event.type}:`, error);
      throw error;
    }
  }

  async publishMessage<T = any>(message: Message<T>): Promise<void> {
    try {
      this.logger.debug(`Publishing message: ${message.type}`, { messageId: message.id });

      // Emit message locally
      this.eventEmitter.emit(`message.${message.type}`, message);
      this.eventEmitter.emit('message.published', message);

      // Notify external subscribers
      await this.notifyExternalSubscribers(message);

      this.logger.debug(`Message published successfully: ${message.type}`, { messageId: message.id });
    } catch (error) {
      this.logger.error(`Failed to publish message ${message.type}:`, error);
      throw error;
    }
  }

  subscribe<T = any>(eventType: string, handler: (event: Event<T>) => void): void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    this.subscribers.get(eventType)!.add(handler);

    // Also subscribe to local event emitter
    this.eventEmitter.on(eventType, handler);

    this.logger.debug(`Subscribed to event type: ${eventType}`);
  }

  unsubscribe(eventType: string, handler: Function): void {
    const handlers = this.subscribers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.subscribers.delete(eventType);
      }
    }

    // Also unsubscribe from local event emitter
    this.eventEmitter.off(eventType, handler);

    this.logger.debug(`Unsubscribed from event type: ${eventType}`);
  }

  async subscribeToPattern(pattern: string, handler: (event: Event) => void): Promise<void> {
    // Subscribe to pattern-based events
    this.eventEmitter.on(pattern, handler);
    this.logger.debug(`Subscribed to event pattern: ${pattern}`);
  }

  async unsubscribeFromPattern(pattern: string, handler: Function): Promise<void> {
    this.eventEmitter.off(pattern, handler);
    this.logger.debug(`Unsubscribed from event pattern: ${pattern}`);
  }

  private async notifyExternalSubscribers(event: Event | Message): Promise<void> {
    try {
      // Get external subscribers for this event type
      const externalSubscribers = await this.getExternalSubscribers(event.type);
      
      // Notify each external subscriber
      for (const subscriber of externalSubscribers) {
        try {
          await this.notifySubscriber(subscriber, event);
        } catch (error) {
          this.logger.error(`Failed to notify external subscriber:`, error);
          // Continue with other subscribers
        }
      }
    } catch (error) {
      this.logger.error('Failed to notify external subscribers:', error);
    }
  }

  private async getExternalSubscribers(eventType: string): Promise<any[]> {
    // This would typically query a database or external service
    // to find subscribers for the given event type
    return [];
  }

  private async notifySubscriber(subscriber: any, event: Event | Message): Promise<void> {
    // This would typically make an HTTP call or send a message
    // to the external subscriber
    this.logger.debug(`Notifying external subscriber: ${subscriber.url}`);
  }

  async getSubscriberCount(eventType: string): Promise<number> {
    const handlers = this.subscribers.get(eventType);
    return handlers ? handlers.size : 0;
  }

  async getSubscribedEventTypes(): Promise<string[]> {
    return Array.from(this.subscribers.keys());
  }

  async clearSubscribers(eventType?: string): Promise<void> {
    if (eventType) {
      this.subscribers.delete(eventType);
      this.logger.debug(`Cleared subscribers for event type: ${eventType}`);
    } else {
      this.subscribers.clear();
      this.logger.debug('Cleared all subscribers');
    }
  }
}
