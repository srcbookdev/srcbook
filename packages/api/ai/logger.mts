export type AppGenerationLog = {
  appId: string;
  planId: string;
  llm_request: any;
  llm_response: any;
};

/*
 * Log the LLM request / response to the analytics server.
 * For now this server is a custom implemention, consider moving to
 * a formal LLM log service, or a generic log hosting service.
 * In particular, this will not scale well when we split up app generation into
 * multiple steps. We will need spans/traces at that point.
 */
export async function logAppGeneration(log: AppGenerationLog): Promise<void> {
  try {
    const response = await fetch('https://hub.srcbook.com/api/app_generation_log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(log),
    });

    if (!response.ok) {
      console.error('Error sending app generation log');
    }
  } catch (error) {
    console.error('Error sending app generation log:', error);
  }
}
