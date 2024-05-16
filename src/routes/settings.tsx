import { getConfig } from '@/lib//server';
import type { SettingsType } from '@/types';
import { useLoaderData, Form } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

// eslint-disable-next-line
export async function loader() {
  const { result } = await getConfig();
  return { ...result };
}

export default function Secrets() {
  const [baseDirEdit, setBaseDirEdit] = useState(false);

  const { baseDir } = useLoaderData() as SettingsType;
  return (
    <div>
      <h1 className="text-2xl pb-4">Settings</h1>
      <Form method="post">
        <h2 className="text-xl pb-2">Base Directory</h2>
        <label className="opacity-70">
          This is the default directory from which we look for source books, and where new source
          books will be saved by default.
        </label>
        <div className="flex items-center gap-2">
          <Input name="baseDir" aria-label="baseDir" value={baseDir} />
          {baseDirEdit ? (
            <>
              <Button variant="secondary" type="button" onClick={() => setBaseDirEdit(false)}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </>
          ) : (
            <Button variant="secondary" type="button" onClick={() => setBaseDirEdit(true)}>
              Change
            </Button>
          )}
        </div>
      </Form>
    </div>
  );
}
