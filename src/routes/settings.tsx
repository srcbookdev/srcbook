import { disk, getConfig, updateConfig } from '@/lib//server';
import type { SettingsType, FsObjectResultType } from '@/types';
import { useLoaderData } from 'react-router-dom';
import { DirPicker } from '@/components/file-picker';

// eslint-disable-next-line
export async function loader() {
  const { result: config } = await getConfig();
  const { result: diskResult } = await disk({ includeHidden: true });
  return { baseDir: config.baseDir, ...diskResult };
}
// eslint-disable-next-line
export async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  const path = formData.get('path') as string;
  await updateConfig({ baseDir: path });
  return null;
}

export default function Secrets() {
  const { entries: initialEntries, baseDir } = useLoaderData() as SettingsType & FsObjectResultType;
  return (
    <div>
      <h1 className="text-2xl pb-4">Settings</h1>
      <h2 className="text-xl pb-2">Base Directory</h2>
      <label className="opacity-70">
        This is the default directory from which we look for source books, and where new source
        books will be saved by default.
      </label>
      <DirPicker initialPath={baseDir} initialEntries={initialEntries} cta="Change" />
    </div>
  );
}
