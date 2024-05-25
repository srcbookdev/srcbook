import type { SessionType, OutputType, CellType, FsObjectResultType } from '@/types';

const SERVER_BASE_URL = 'http://localhost:2150';

interface ExecRequestType {
  source: string;
  cellId: string;
}

type ExecResponseType = {
  result: CellType;
};

export async function exec(sessionId: string, request: ExecRequestType): Promise<ExecResponseType> {
  const response = await fetch(SERVER_BASE_URL + '/sessions/' + sessionId + '/exec', {
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

interface DiskRequestType {
  dirname?: string;
}

interface DiskResponseType {
  error: boolean;
  result: FsObjectResultType;
}

export async function disk(request?: DiskRequestType): Promise<DiskResponseType> {
  const response = await fetch(SERVER_BASE_URL + '/disk', {
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
  dirname: string;
  title: string;
}

interface CreateSessionResponseType {
  error: boolean;
  result: { id: string };
}

export async function createSession(
  request: CreateSessionRequestType,
): Promise<CreateSessionResponseType> {
  const response = await fetch(SERVER_BASE_URL + '/sessions', {
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
  const response = await fetch(SERVER_BASE_URL + '/sessions/' + request.id, {
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
  const response = await fetch(SERVER_BASE_URL + '/sessions', {
    method: 'GET',
    headers: { 'content-type': 'application/json' },
  });

  if (!response.ok) {
    console.error(response);
    throw new Error('Request failed');
  }

  return response.json();
}

interface ExportSessionRequestType {
  filename: string;
}
export async function exportSession(sessionId: string, request: ExportSessionRequestType) {
  const response = await fetch(SERVER_BASE_URL + '/sessions/' + sessionId + '/export', {
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

interface CreateCellRequestType {
  sessionId: string;
  type: 'code' | 'markdown';
  index?: number;
}

interface CreateCellResponseType {
  error: boolean;
  result: CellType;
}

export async function createCell(request: CreateCellRequestType): Promise<CreateCellResponseType> {
  const response = await fetch(SERVER_BASE_URL + '/sessions/' + request.sessionId + '/cells', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: request.type, index: request.index }),
  });

  if (!response.ok) {
    console.error(response);
    throw new Error('Request failed');
  }

  return response.json();
}

interface UpdateCellRequestType {
  sessionId: string;
  cellId: string;
  source?: string;
  text?: string;
  filename?: string;
  output?: OutputType[];
}

interface UpdateCellResponseType {
  error: boolean;
  result: CellType;
}

export async function updateCell(request: UpdateCellRequestType): Promise<UpdateCellResponseType> {
  const response = await fetch(
    SERVER_BASE_URL + '/sessions/' + request.sessionId + '/cells/' + request.cellId,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        source: request.source,
        filename: request.filename,
        text: request.text,
        output: request.output,
      }),
    },
  );

  if (!response.ok) {
    if (response.status === 400) {
      const error = await response.json();
      throw new Error(error.message);
    } else {
      throw new Error('Request failed');
    }
  }

  return response.json();
}

interface DeleteCellRequestType {
  sessionId: string;
  cellId: string;
}

type DeleteResponseType = {
  error: boolean;
  message: string;
};

type SuccessDeleteResponseType = {
  result: CellType[];
};

type DeleteCellResponseType = DeleteResponseType | SuccessDeleteResponseType;

export async function deleteCell(request: DeleteCellRequestType): Promise<DeleteCellResponseType> {
  const response = await fetch(
    SERVER_BASE_URL + '/sessions/' + request.sessionId + '/cells/' + request.cellId,
    {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
    },
  );

  if (!response.ok) {
    console.error(response);
    throw new Error('Request failed');
  }

  return response.json();
}

// Config settings
interface EditConfigRequestType {
  baseDir: string;
}

export async function getConfig() {
  const response = await fetch(SERVER_BASE_URL + '/settings', {
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
  const response = await fetch(SERVER_BASE_URL + '/settings', {
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
  const response = await fetch(SERVER_BASE_URL + '/secrets', {
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
  const response = await fetch(SERVER_BASE_URL + '/secrets', {
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
  const response = await fetch(SERVER_BASE_URL + '/secrets/' + request.previousName, {
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
  const response = await fetch(SERVER_BASE_URL + '/secrets/' + request.name, {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
  });
  if (!response.ok) {
    console.error(response);
    throw new Error('Request for deleting a secret failed');
  }
  return response.json();
}

export async function getNodeVersion() {
  const response = await fetch(SERVER_BASE_URL + '/node_version', {
    headers: { 'content-type': 'application/json' },
  });

  if (!response.ok) {
    console.error(response);
    throw new Error('Request failed');
  }
  return response.json();
}

interface InstallNpmPackageRequestType {
  packageName: string;
}
export async function installNpmPackage(sessionId: string, request: InstallNpmPackageRequestType) {
  const response = await fetch(SERVER_BASE_URL + '/sessions/' + sessionId + '/npm/install', {
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

// NPM package search, has to happen on the server given CORS restrictions
export async function searchNpmPackages(query: string) {
  if (query === '') {
    return { error: false, result: [] };
  }
  const response = await fetch(SERVER_BASE_URL + '/npm/search?q=' + query, {
    headers: { 'content-type': 'application/json' },
  });
  if (!response.ok) {
    console.error(response);
    return { error: true, result: [] };
  }
  return response.json();
}
