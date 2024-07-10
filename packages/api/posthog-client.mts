import { PostHog } from 'posthog-node';
import { getConfig } from './config.mjs';
import { IS_PRODUCTION } from './constants.mjs';

type QueuedEvent = {
  event: string;
  properties?: Record<string, any>;
};

class PostHogClient {
  private static instance: PostHogClient | null = null;
  private distinctId: string | null = null;
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
    this.distinctId = config.distinctId;

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
        this.client.capture({ ...event, distinctId: this.distinctId as string });
      }
    }
  }

  public capture(event: QueuedEvent): void {
    if (this.isInitialized && IS_PRODUCTION) {
      if (this.isEnabled && this.client) {
        this.client.capture({ ...event, distinctId: this.distinctId as string });
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
