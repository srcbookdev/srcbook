import { CodeLanguageType, type CodeCellType } from '@srcbook/shared';
import { SessionType, FsObjectResultType, ExampleSrcbookType } from '@/types';

const API_BASE_URL = 'http://localhost:2150/api';

interface DiskRequestType {
  dirname?: string;
}

export interface DiskResponseType {
  error: boolean;
  result: FsObjectResultType;
}

export async function disk(request?: DiskRequestType): Promise<DiskResponseType> {
  const response = await fetch(API_BASE_URL + '/disk', {
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

type GenerateCellRequestType = { insertIdx: number; query: string };
type GenerateCellResponseType =
  | { error: true; result: string }
  | { error: false; result: CodeCellType };
export async function generateCell(
  sessionId: string,
  request: GenerateCellRequestType,
): Promise<GenerateCellResponseType> {
  const response = await fetch(API_BASE_URL + '/sessions/' + sessionId + '/generate_cell', {
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

// Config settings
interface EditConfigRequestType {
  baseDir?: string;
  defaultLanguage?: 'typescript' | 'javascript';
  openaiKey?: string;
  enabledAnalytics?: boolean;
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

export async function updateConfig(request: EditConfigRequestType) {
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
export async function getSecrets() {
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
