/**
 * Analytics event tracking
 * Based on PRD Section P
 */

type EventName =
  | 'gmail_connect_started'
  | 'gmail_connect_success'
  | 'gmail_connect_failed'
  | 'gmail_backfill_started'
  | 'gmail_backfill_completed'
  | 'statement_upload_started'
  | 'statement_upload_completed'
  | 'statement_upload_failed'
  | 'statement_parsed'
  | 'spend_snapshot_created'
  | 'optimizer_run_completed'
  | 'cg_reco_viewed'
  | 'lead_generated';

type EventProperties = {
  user_id?: string;
  bank_code?: string;
  parse_latency_ms?: number;
  month?: string;
  missed_value_total?: number;
  error_code?: string;
  [key: string]: any;
};

/**
 * Track analytics event
 * @param eventName Event name
 * @param properties Event properties
 */
export async function trackEvent(
  eventName: EventName,
  properties: EventProperties = {}
): Promise<void> {
  // Check if analytics is enabled
  if (process.env.ANALYTICS_ENABLED !== 'true') {
    return;
  }

  try {
    // In production, integrate with your analytics provider
    // Examples: Mixpanel, Amplitude, PostHog, etc.
    
    const event = {
      event: eventName,
      properties: {
        ...properties,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
      },
    };

    // Console log for development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics]', JSON.stringify(event, null, 2));
    }

    // TODO: Send to analytics service
    // Example with fetch:
    // await fetch('https://api.analytics-provider.com/track', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${process.env.ANALYTICS_WRITE_KEY}`,
    //   },
    //   body: JSON.stringify(event),
    // });

  } catch (error) {
    // Don't throw - analytics failures shouldn't break app
    console.error('Analytics error:', error);
  }
}

/**
 * Track page view
 */
export async function trackPageView(
  page: string,
  properties: EventProperties = {}
): Promise<void> {
  return trackEvent('cg_reco_viewed', {
    ...properties,
    page,
  });
}

