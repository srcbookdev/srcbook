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
  const dirname = formData.get('dirname') as string;
  const basename = formData.get('basename') as string;
  const { result } = await createSession({ dirname, basename });
  return redirect(`/sessions/${result.id}`);
}

export default function Home() {
  const { dirname } = useLoaderData() as FsObjectResultType;
  const [basename, setBasename] = useState('');

  return (
    <>
      <h1 className="text-2xl mx-auto mb-8">Src Books</h1>
      <p>Create your next source book or open an existing one below.</p>
      <div className="mt-4 flex items-center gap-12">
        <Form method="post" className="h-full">
          <Input type="hidden" name="dirname" value={dirname} />
          <div className="flex items-center justify-center h-full gap-2">
            <Input
              placeholder="name your new srcBook"
              required
              className="w-60"
              onChange={(e) => setBasename(e.target.value)}
              name="basename"
              value={basename}
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
