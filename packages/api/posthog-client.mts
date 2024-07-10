import { PostHog } from 'posthog-node';
import { getConfig } from './config.mjs';

type QueuedEvent = {
  distinctId: string;
  event: string;
  properties?: Record<string, any>;
};

class PostHogClient {
  private static instance: PostHogClient | null = null;
  private client: PostHog | null = null;
  private isEnabled: boolean = false;
  private isInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  private eventQueue: QueuedEvent[] = [];

  private constructor() {
    this.initializationPromise = this.initialize();
  }

  public static getInstance(): PostHogClient {
    if (!PostHogClient.instance) {
      PostHogClient.instance = new PostHogClient();
    }
    return PostHogClient.instance;
  }

  private async initialize(): Promise<void> {
    const config = await getConfig();
    this.isEnabled = config.enabledAnalytics;

    if (this.isEnabled) {
      this.client = new PostHog(
        // We're sending over API key to GitHub and clients, but it's the only way.
        'phc_bQjmPYXmbl76j8gW289Qj9XILuu1STRnIfgCSKlxdgu',
        { host: 'https://us.i.posthog.com' },
      );
    }

    this.isInitialized = true;
    this.flushQueue();
  }

  private async flushQueue(): Promise<void> {
    if (!this.isEnabled || !this.client) {
      this.eventQueue = []; // Clear the queue if analytics are disabled
      return;
    }

    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      if (event) {
        this.client.capture(event);
      }
    }
  }

  public capture(event: QueuedEvent): void {
    if (this.isInitialized) {
      if (this.isEnabled && this.client) {
        this.client.capture(event);
      }
    } else {
      this.eventQueue.push(event);
    }
  }

  public async shutdown(): Promise<void> {
    await this.initializationPromise; // Ensure initialization is complete
    await this.flushQueue();
    if (this.client) {
      await this.client.shutdown();
    }
  }
}

export const posthog = PostHogClient.getInstance();
