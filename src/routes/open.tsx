import { useLoaderData, redirect } from 'react-router-dom';
import { disk, createSession } from '@/lib/server';
import FilePicker from '@/components/file-picker';

import type { FsObjectResultType } from '@/types';

// eslint-disable-next-line
export async function loader() {
  const { result } = await disk();
  return result;
}

// eslint-disable-next-line
export async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  const path = formData.get('path') as string;
  const { result } = await createSession({ path });
  return redirect(`/sessions/${result.id}`);
}

export default function Open() {
  const { path: initialPath, entries: initialEntries } = useLoaderData() as FsObjectResultType;

  return (
    <>
      <h1 className="text-2xl">Notebooks</h1>
      <FilePicker initialPath={initialPath} initialEntries={initialEntries} cta="Open" />
    </>
  );
}
