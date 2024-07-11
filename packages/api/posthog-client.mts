import { PostHog } from 'posthog-node';
import { getConfig } from './config.mjs';
import { IS_PRODUCTION } from './constants.mjs';

type QueuedEvent = {
  event: string;
  properties?: Record<string, any>;
};

class PostHogClient {
  private distinctId: string;
  private client: PostHog | null = null;
  private isEnabled: boolean = false;
  private eventQueue: QueuedEvent[] = [];

  constructor(config: { enabledAnalytics: boolean; distinctId: string }) {
    this.isEnabled = config.enabledAnalytics;
    this.distinctId = config.distinctId;

    if (this.isEnabled) {
      this.client = new PostHog(
        // We're sending over API key to GitHub and clients, but it's the only way.
        'phc_bQjmPYXmbl76j8gW289Qj9XILuu1STRnIfgCSKlxdgu',
        { host: 'https://us.i.posthog.com' },
      );
    }

    this.flushQueue();
  }

  private flushQueue(): void {
    if (!this.isEnabled || !this.client) {
      this.eventQueue = []; // Clear the queue if analytics are disabled
      return;
    }

    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      if (event) {
        this.client.capture({ ...event, distinctId: this.distinctId });
      }
    }
  }

  public capture(event: QueuedEvent): void {
    if (this.isEnabled && IS_PRODUCTION) {
      if (this.client) {
        this.client.capture({ ...event, distinctId: this.distinctId });
      }
    } else {
      this.eventQueue.push(event);
    }
  }

  public async shutdown(): Promise<void> {
    this.flushQueue();
    if (this.client) {
      await this.client.shutdown();
    }
  }
}

const config = await getConfig();
export const posthog = new PostHogClient(config);
