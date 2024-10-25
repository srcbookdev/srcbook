import type {
  AppGenerationFeedbackType,
  AppType,
  DirEntryType,
  FileEntryType,
  FileType,
} from '@srcbook/shared';
import SRCBOOK_CONFIG from '@/config';
import type { PlanType } from '@/components/apps/types';
import type { HistoryType, MessageType } from '@srcbook/shared';

const API_BASE_URL = `${SRCBOOK_CONFIG.api.origin}/api`;

export async function createApp(request: {
  name: string;
  prompt?: string;
}): Promise<{ data: AppType }> {
  const response = await fetch(API_BASE_URL + '/apps', {
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

export async function deleteApp(id: string): Promise<void> {
  const response = await fetch(API_BASE_URL + '/apps/' + id, {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
  });

  if (!response.ok) {
    console.error(response);
    throw new Error('Request failed');
  }
}

export async function loadApps(sort: 'asc' | 'desc'): Promise<{ data: AppType[] }> {
  const response = await fetch(API_BASE_URL + '/apps?sort=' + sort, {
    method: 'GET',
    headers: { 'content-type': 'application/json' },
  });

  if (!response.ok) {
    console.error(response);
    throw new Error('Request failed');
  }

  return response.json();
}

export async function loadApp(id: string): Promise<{ data: AppType }> {
  const response = await fetch(API_BASE_URL + '/apps/' + id, {
    method: 'GET',
    headers: { 'content-type': 'application/json' },
  });

  if (!response.ok) {
    console.error(response);
    throw new Error('Request failed');
  }

  return response.json();
}

export async function updateApp(id: string, attrs: { name: string }): Promise<{ data: AppType }> {
  const response = await fetch(API_BASE_URL + '/apps/' + id, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(attrs),
  });

  if (!response.ok) {
    console.error(response);
    throw new Error('Request failed');
  }

  return response.json();
}

export async function loadDirectory(id: string, path: string): Promise<{ data: DirEntryType }> {
  const queryParams = new URLSearchParams({ path });

  const response = await fetch(API_BASE_URL + `/apps/${id}/directories?${queryParams}`, {
    method: 'GET',
    headers: { 'content-type': 'application/json' },
  });

  if (!response.ok) {
    console.error(response);
    throw new Error('Request failed');
  }

  return response.json();
}

export async function createDirectory(
  id: string,
  dirname: string,
  basename: string,
): Promise<{ data: DirEntryType }> {
  const response = await fetch(API_BASE_URL + `/apps/${id}/directories`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ dirname, basename }),
  });

  if (!response.ok) {
    console.error(response);
    throw new Error('Request failed');
  }

  return response.json();
}

export async function deleteDirectory(
  id: string,
  path: string,
): Promise<{ data: { deleted: true } }> {
  const queryParams = new URLSearchParams({ path });

  const response = await fetch(API_BASE_URL + `/apps/${id}/directories?${queryParams}`, {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
  });

  if (!response.ok) {
    console.error(response);
    throw new Error('Request failed');
  }

  return response.json();
}

export async function renameDirectory(
  id: string,
  path: string,
  name: string,
): Promise<{ data: DirEntryType }> {
  const queryParams = new URLSearchParams({ path, name });

  const response = await fetch(API_BASE_URL + `/apps/${id}/directories/rename?${queryParams}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
  });

  if (!response.ok) {
    console.error(response);
    throw new Error('Request failed');
  }

  return response.json();
}

export async function loadFile(id: string, path: string): Promise<{ data: FileType }> {
  const queryParams = new URLSearchParams({ path });

  const response = await fetch(API_BASE_URL + `/apps/${id}/files?${queryParams}`, {
    method: 'GET',
    headers: { 'content-type': 'application/json' },
  });

  if (!response.ok) {
    console.error(response);
    throw new Error('Request failed');
  }

  return response.json();
}

export async function createFile(
  id: string,
  dirname: string,
  basename: string,
  source: string,
): Promise<{ data: FileEntryType }> {
  const response = await fetch(API_BASE_URL + `/apps/${id}/files`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ dirname, basename, source }),
  });

  if (!response.ok) {
    console.error(response);
    throw new Error('Request failed');
  }

  return response.json();
}

export async function deleteFile(id: string, path: string): Promise<{ data: { deleted: true } }> {
  const queryParams = new URLSearchParams({ path });

  const response = await fetch(API_BASE_URL + `/apps/${id}/files?${queryParams}`, {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
  });

  if (!response.ok) {
    console.error(response);
    throw new Error('Request failed');
  }

  return response.json();
}

export async function renameFile(
  id: string,
  path: string,
  name: string,
): Promise<{ data: FileEntryType }> {
  const queryParams = new URLSearchParams({ path, name });

  const response = await fetch(API_BASE_URL + `/apps/${id}/files/rename?${queryParams}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
  });

  if (!response.ok) {
    console.error(response);
    throw new Error('Request failed');
  }

  return response.json();
}

export async function aiEditApp(
  id: string,
  query: string,
  planId: string,
): Promise<{ data: PlanType }> {
  const response = await fetch(API_BASE_URL + `/apps/${id}/edit`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, planId }),
  });

  if (!response.ok) {
    console.error(response);
    throw new Error('Request failed');
  }

  return response.json();
}

export async function loadHistory(id: string): Promise<{ data: HistoryType }> {
  const response = await fetch(API_BASE_URL + `/apps/${id}/history`, {
    method: 'GET',
    headers: { 'content-type': 'application/json' },
  });

  if (!response.ok) {
    console.error(response);
    throw new Error('Request failed');
  }

  return response.json();
}

export async function appendToHistory(id: string, messages: MessageType | MessageType[]) {
  const response = await fetch(API_BASE_URL + `/apps/${id}/history`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
  return response.json();
}

export async function aiGenerationFeedback(id: string, feedback: AppGenerationFeedbackType) {
  const response = await fetch(API_BASE_URL + `/apps/${id}/feedback`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(feedback),
  });
  return response.json();
}

export async function exportApp(id: string, name: string): Promise<Blob> {
  const response = await fetch(API_BASE_URL + `/apps/${id}/export`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    console.error(response);
    throw new Error('Export failed');
  }

  return response.blob();
}

type VersionResponse = {
  sha: string;
};

export async function getCurrentVersion(id: string): Promise<VersionResponse> {
  const response = await fetch(API_BASE_URL + `/apps/${id}/commit`, {
    method: 'GET',
    headers: { 'content-type': 'application/json' },
  });
  return response.json();
}

export async function commitVersion(id: string, message: string): Promise<VersionResponse> {
  const response = await fetch(API_BASE_URL + `/apps/${id}/commit`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message }),
  });

  return response.json();
}

export async function checkoutVersion(
  id: string,
  sha: string,
): Promise<{ success: true; sha: string }> {
  const response = await fetch(API_BASE_URL + `/apps/${id}/checkout/${sha}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
  });
  return response.json();
}
