import type { AppType, CodeLanguageType, DirEntryType, FileType } from '@srcbook/shared';
import SRCBOOK_CONFIG from '@/config';

const API_BASE_URL = `${SRCBOOK_CONFIG.api.origin}/api`;

export async function createApp(request: {
  name: string;
  prompt?: string;
  language: CodeLanguageType;
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
