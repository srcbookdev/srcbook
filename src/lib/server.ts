import type { CellType, FsObjectResultType, SessionType } from '@/types';

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
  basename: string;
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
