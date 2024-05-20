import { disk, getConfig, updateConfig } from '@/lib//server';
import type { SettingsType, FsObjectResultType } from '@/types';
import { useLoaderData } from 'react-router-dom';
import { DirPicker } from '@/components/file-picker';

// eslint-disable-next-line
export async function loader() {
  const [{ result: config }, { result: diskResult }] = await Promise.all([getConfig(), disk({})]);

  return { baseDir: config.baseDir, ...diskResult };
}
// eslint-disable-next-line
export async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  const dirname = formData.get('dirname') as string;
  await updateConfig({ baseDir: dirname });
  return null;
}

export default function Secrets() {
  const { entries, baseDir } = useLoaderData() as SettingsType & FsObjectResultType;
  return (
    <div>
      <h1 className="text-2xl pb-4">Settings</h1>
      <h2 className="text-xl pb-2">Base Directory</h2>
      <label className="opacity-70">
        This is the default directory from which we look for source books, and where new source
        books will be saved by default.
      </label>
      <DirPicker dirname={baseDir} entries={entries} cta="Change" />
    </div>
  );
}
