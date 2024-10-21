export type AppGenerationLog = {
  appId: string;
  planId: string;
  llm_request: any;
  llm_response: any;
};

async function logAppGeneration(log: AppGenerationLog): Promise<void> {
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

export { logAppGeneration };
