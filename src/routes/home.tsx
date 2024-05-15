import { PlusIcon } from 'lucide-react';
import { Form, useLoaderData, redirect } from 'react-router-dom';
import { disk, createSession } from '@/lib/server';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

import type { FsObjectResultType } from '@/types';

// eslint-disable-next-line
export async function loader() {
  const { result } = await disk();
  return result;
}

// eslint-disable-next-line
export async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  const initialPath = formData.get('initialPath') as string;
  const path = `${initialPath}/Untitled.jsmd`;
  const { result } = await createSession({ path });
  return redirect(`/sessions/${result.id}`);
}

export default function Home() {
  const { path: initialPath } = useLoaderData() as FsObjectResultType;
  const [name, setName] = useState('');

  return (
    <>
      <h1 className="text-2xl">Notebooks</h1>
      <div className="mt-10 flex items-center justify-center gap-12">
        <Form method="post" className="h-full">
          <Input type="hidden" name="initialPath" value={initialPath} />
          <div className="flex items-center justify-center h-full gap-2">
            <Input
              placeholder="name your new srcBook"
              required
              className="w-60"
              onChange={(e) => setName(e.target.value)}
              name="name"
              value={name}
            />
            <Button className="min-w-32" type="submit">
              <div className="flex gap-2 items-center">
                Create New <PlusIcon size={16} />
              </div>
            </Button>
          </div>
        </Form>
        <p>or</p>
        <div className="flex flex-col items-center justify-center h-full">
          <Form action="/open" className="flex items-center space-x-2">
            <Button variant="outline" className="min-w-32" type="submit">
              Open
            </Button>
          </Form>
        </div>
      </div>
    </>
  );
}
