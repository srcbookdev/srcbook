import { PlusIcon } from 'lucide-react';
import { Form, useLoaderData, redirect, Link } from 'react-router-dom';
import { getConfig, createSession, loadSessions } from '@/lib/server';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import CanvasCells from '@/components/canvas-cells';

import type { SessionType, TitleCellType } from '@/types';

async function loader() {
  const { result: config } = await getConfig();
  const { result: sessions } = await loadSessions();
  return { baseDir: config.baseDir, sessions };
}

async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  const dirname = formData.get('dirname') as string;
  const title = formData.get('title') as string;
  const { result } = await createSession({ dirname, title });
  return redirect(`/sessions/${result.id}`);
}

type HomeLoaderDataType = {
  baseDir: string;
  sessions: SessionType[];
};

function Home() {
  const { baseDir, sessions } = useLoaderData() as HomeLoaderDataType;

  const [title, setTitle] = useState('');

  return (
    <>
      <h1 className="text-2xl mx-auto mb-8">Srcbooks</h1>
      <p>Create your next Srcbook or open an existing one below.</p>
      <div className="mt-4 flex items-center gap-12">
        <Form method="post" className="h-full">
          <Input type="hidden" name="dirname" value={baseDir} />
          <div className="flex items-center justify-center h-full gap-2">
            <Input
              placeholder="name your new srcBook"
              required
              className="w-60"
              onChange={(e) => setTitle(e.target.value)}
              name="title"
              value={title}
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
      <h2 className="text-xl mx-auto mt-8 mb-4">Recent notebooks</h2>
      {sessions.length === 0 ? (
        <p className="text-gray-500">
          No sessions are currently open. Create a new session or open a previous one.
        </p>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {sessions.map((session) => {
            return (
              <div
                key={session.id}
                className="border border-gray-200 rounded-lg p-3 transition-all hover:bg-gray-50 w-full"
              >
                <Link to={`sessions/${session.id}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{(session.cells[0] as TitleCellType).text}</p>
                      <p className="text-sm text-gray-400">{session.cells.length} cells</p>
                    </div>
                    <CanvasCells numCells={session.cells.length} height={80} width={40} />
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

Home.loader = loader;
Home.action = action;
export default Home;
