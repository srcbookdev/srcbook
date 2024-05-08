const SERVER_URL = 'http://localhost:2150/exec';

interface ExecRequestType {
  code: string;
  sessionId: string;
}

export async function exec(request: ExecRequestType) {
  const response = await fetch(SERVER_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    console.error(response);
    throw new Error('Request failed');
  }

  return response.json();
}
