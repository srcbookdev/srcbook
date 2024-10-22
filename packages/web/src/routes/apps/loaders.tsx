import { type LoaderFunctionArgs } from 'react-router-dom';

import { loadApp, loadDirectory, loadFile } from '@/clients/http/apps';

export async function index({ params }: LoaderFunctionArgs) {
  const { data: app } = await loadApp(params.id!);
  return { app };
}

export async function preview({ params }: LoaderFunctionArgs) {
  const { data: rootDirEntries } = await loadDirectory(params.id!, '.');
  return { rootDirEntries };
}

export async function filesShow({ params }: LoaderFunctionArgs) {
  const path = decodeURIComponent(params.path!);

  const [{ data: rootDirEntries }, { data: file }] = await Promise.all([
    loadDirectory(params.id!, '.'),
    loadFile(params.id!, path),
  ]);

  return { initialOpenedFile: file, rootDirEntries };
}
