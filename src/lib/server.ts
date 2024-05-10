import type { CellType, FsObjectResultType } from '@/types';

const SERVER_BASE_URL = 'http://localhost:2150';

interface ExecRequestType {
  code: string;
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
  path?: string;
  includeHidden?: boolean;
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
  path: string;
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
  result: { id: string };
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
  type: 'section' | 'code';
}

interface CreateCellResponseType {
  error: boolean;
  result: CellType;
}

export async function createCell(request: CreateCellRequestType): Promise<CreateCellResponseType> {
  const response = await fetch(SERVER_BASE_URL + '/sessions/' + request.sessionId + '/cells', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: request.type }),
  });

  if (!response.ok) {
    console.error(response);
    throw new Error('Request failed');
  }

  return response.json();
}
