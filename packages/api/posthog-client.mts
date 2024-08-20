import { PostHog } from 'posthog-node';
import { getConfig } from './config.mjs';
import { IS_PRODUCTION } from './constants.mjs';

const POSTHOG_API_KEY = 'phc_bQjmPYXmbl76j8gW289Qj9XILuu1STRnIfgCSKlxdgu';
const POSTHOG_HOST = 'https://us.i.posthog.com';

type EventType = {
  event: string;
  properties?: Record<string, any>;
};

class PostHogClient {
  private installId: string;
  private client: PostHog;

  constructor(config: { installId: string }) {
    this.installId = config.installId;
    this.client = new PostHog(POSTHOG_API_KEY, { host: POSTHOG_HOST });
  }

  private get analyticsEnabled(): boolean {
    const disabled = process.env.SRCBOOK_DISABLE_ANALYTICS || '';
    return disabled.toLowerCase() !== 'true';
  }

  private get isEnabled(): boolean {
    return this.analyticsEnabled && IS_PRODUCTION;
  }

  public capture(event: EventType): void {
    if (!this.isEnabled) {
      return;
    }

    this.client.capture({ ...event, distinctId: this.installId });
  }

  public shutdown() {
    this.client.shutdown();
  }
}

export const posthog = new PostHogClient(await getConfig());
