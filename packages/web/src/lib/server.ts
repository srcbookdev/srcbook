import type {
  AiProviderType,
  CodeLanguageType,
  MarkdownCellType,
  CodeCellType,
  SecretWithAssociatedSessions,
  CodiumCompletionResult,
} from '@srcbook/shared';
import { SessionType, ExampleSrcbookType } from '@/types';
import SRCBOOK_CONFIG from '@/config';

const API_BASE_URL = `${SRCBOOK_CONFIG.api.origin}/api`;

export async function getFileContent(filename: string) {
  const file_response = await fetch(API_BASE_URL + '/file', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      file: filename,
    }),
  });
  return await file_response.json();
}

interface CreateSrcbookRequestType {
  path: string;
  name: string;
  language: CodeLanguageType;
}

interface CreateSrcbookResponseType {
  error: boolean;
  result: { path: string; name: string };
}

export async function createSrcbook(
  request: CreateSrcbookRequestType,
): Promise<CreateSrcbookResponseType> {
  const response = await fetch(API_BASE_URL + '/srcbooks', {
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

export async function deleteSrcbook(request: { id: string }) {
  const response = await fetch(API_BASE_URL + '/srcbooks/' + request.id, {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
  });

  if (!response.ok) {
    console.error(response);
    throw new Error('Request failed');
  }
}

interface ImportSrcbookRequestType {
  path?: string;
  url?: string;
  text?: string;
}

interface ImportSrcbookResponseType {
  error: boolean;
  result: { dir: string; name: string };
}

export async function importSrcbook(
  request: ImportSrcbookRequestType,
): Promise<ImportSrcbookResponseType> {
  const response = await fetch(API_BASE_URL + '/import', {
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

type GenerateSrcbookRequestType = { query: string };
type GenerateSrcbookResponseType =
  | { error: false; result: { dir: string } }
  | { error: true; result: string };

export async function generateSrcbook(
  request: GenerateSrcbookRequestType,
): Promise<GenerateSrcbookResponseType> {
  const response = await fetch(API_BASE_URL + '/generate', {
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

type GenerateCellsRequestType = { insertIdx: number; query: string };
type GenerateCellsResponseType =
  | { error: true; result: string }
  | { error: false; result: Array<CodeCellType | MarkdownCellType> };
export async function generateCells(
  sessionId: string,
  request: GenerateCellsRequestType,
): Promise<GenerateCellsResponseType> {
  const response = await fetch(API_BASE_URL + '/sessions/' + sessionId + '/generate_cells', {
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

interface CreateSessionRequestType {
  path: string;
}

interface CreateSessionResponseType {
  error: boolean;
  result: { id: string };
}

export async function createSession(
  request: CreateSessionRequestType,
): Promise<CreateSessionResponseType> {
  const response = await fetch(API_BASE_URL + '/sessions', {
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

interface LoadSessionRequestType {
  id: string;
}

interface LoadSessionResponseType {
  error: boolean;
  result: SessionType;
}

export async function loadSession(
  request: LoadSessionRequestType,
): Promise<LoadSessionResponseType> {
  const response = await fetch(API_BASE_URL + '/sessions/' + request.id, {
    method: 'GET',
    headers: { 'content-type': 'application/json' },
  });

  if (!response.ok) {
    console.error(response);
    throw new Error('Request failed');
  }

  return response.json();
}

export async function loadSessions(): Promise<{ error: boolean; result: SessionType[] }> {
  const response = await fetch(API_BASE_URL + '/sessions', {
    method: 'GET',
    headers: { 'content-type': 'application/json' },
  });

  if (!response.ok) {
    console.error(response);
    throw new Error('Request failed');
  }

  return response.json();
}

interface ExportSrcmdFileRequestType {
  filename: string;
  directory: string;
}

export async function exportSrcmdFile(sessionId: string, request: ExportSrcmdFileRequestType) {
  const response = await fetch(API_BASE_URL + '/sessions/' + sessionId + '/export', {
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

export async function exportSrcmdText(sessionId: string) {
  const response = await fetch(API_BASE_URL + '/sessions/' + sessionId + '/export-text');

  if (!response.ok) {
    console.error(response);
    throw new Error('Request failed');
  }

  return response.text();
}

// Config settings
interface EditConfigRequestType {
  baseDir?: string;
  defaultLanguage?: 'typescript' | 'javascript';
  openaiKey?: string;
  anthropicKey?: string;
  aiBaseUrl?: string;
  aiModel?: string;
  aiProvider?: AiProviderType;
  codeiumApiKey?: string;
  subscriptionEmail?: string | null;
}

export async function getConfig() {
  const response = await fetch(API_BASE_URL + '/settings', {
    method: 'GET',
    headers: { 'content-type': 'application/json' },
  });

  if (!response.ok) {
    console.error(response);
    throw new Error('Request failed');
  }
  return response.json();
}

export async function updateConfig(request: EditConfigRequestType): Promise<void> {
  const response = await fetch(API_BASE_URL + '/settings', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    console.error(response);
    throw new Error('Request failed');
  }
}

// Secret management
export async function getSecrets(): Promise<{ result: SecretWithAssociatedSessions[] }> {
  const response = await fetch(API_BASE_URL + '/secrets', {
    method: 'GET',
    headers: { 'content-type': 'application/json' },
  });

  if (!response.ok) {
    console.error(response);
    throw new Error('Request failed');
  }
  return response.json();
}

interface CreateSecretRequestType {
  name: string;
  value: string;
}

export async function createSecret(request: CreateSecretRequestType) {
  const response = await fetch(API_BASE_URL + '/secrets', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    console.error(response);
    throw new Error('Request for creating a secret failed');
  }
  return response.json();
}

interface UpdateSecretRequestType {
  previousName: string;
  name: string;
  value: string;
}
export async function updateSecret(request: UpdateSecretRequestType) {
  const response = await fetch(API_BASE_URL + '/secrets/' + request.previousName, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    console.error(response);
    throw new Error('Request for updating a secret failed');
  }
  return response.json();
}

interface DeleteSecretRequestType {
  name: string;
}
export async function deleteSecret(request: DeleteSecretRequestType) {
  const response = await fetch(API_BASE_URL + '/secrets/' + request.name, {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
  });
  if (!response.ok) {
    console.error(response);
    throw new Error('Request for deleting a secret failed');
  }
  return response.json();
}

export async function associateSecretWithSession(sessionId: string, secretName: string) {
  const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/secrets/${secretName}`, {
    method: 'PUT',
  });

  if (!response.ok) {
    console.error(response);
    throw new Error('Request failed');
  }
}

export async function disassociateSecretWithSession(sessionId: string, secretName: string) {
  const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/secrets/${secretName}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    console.error(response);
    throw new Error('Request failed');
  }
}

// NPM package search, has to happen on the server given CORS restrictions
export async function searchNpmPackages(query: string, size: number) {
  if (query === '') {
    return { error: false, result: [] };
  }

  const response = await fetch(
    `${API_BASE_URL}/npm/search?q=${encodeURIComponent(query)}&size=${size}`,
    {
      headers: { 'content-type': 'application/json' },
    },
  );

  if (!response.ok) {
    console.error(response);
    return { error: true, result: [] };
  }

  return response.json();
}

type SrcbookExamplesResponse = {
  result: ExampleSrcbookType[];
};

export async function loadSrcbookExamples(): Promise<SrcbookExamplesResponse> {
  const response = await fetch(API_BASE_URL + '/examples', {
    method: 'GET',
    headers: { 'content-type': 'application/json' },
  });

  if (!response.ok) {
    console.error(response);
    throw new Error('Request failed');
  }

  return response.json();
}

type FeedbackRequestType = {
  feedback: string;
  email: string;
};

export async function sendFeedback({ feedback, email }: FeedbackRequestType) {
  const response = await fetch(API_BASE_URL + '/feedback', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ feedback, email }),
  });

  if (!response.ok) {
    console.error(response);
  }
}

export async function aiHealthcheck() {
  const response = await fetch(API_BASE_URL + '/ai/healthcheck', {
    method: 'GET',
    headers: { 'content-type': 'application/json' },
  });
  if (!response.ok) {
    console.error(response);
  }
  return response.json();
}

export async function subscribeToMailingList(email: string) {
  const response = await fetch(API_BASE_URL + '/subscribe', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    console.error(response);
    throw new Error('Subscription request failed');
  }

  return response.json();
}
