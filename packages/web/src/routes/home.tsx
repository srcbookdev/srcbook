import { PlusIcon } from 'lucide-react';
import { Form, useLoaderData, redirect, Link } from 'react-router-dom';
import { CodeLanguageType, TitleCellType } from '@srcbook/shared';
import DeleteSrcbookModal from '@/components/delete-srcbook-dialog';
import { getConfig, createSession, loadSessions, createSrcbook } from '@/lib/server';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import CanvasCells from '@/components/canvas-cells';
import { Switch } from '@/components/ui/switch';
import type { SessionType } from '@/types';
import { useState } from 'react';
import { LanguageLogo } from '@/components/logos';

async function loader() {
  const { result: config } = await getConfig();
  const { result: sessions } = await loadSessions();
  return { baseDir: config.baseDir, sessions };
}

async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  const path = formData.get('path') as string;
  const name = formData.get('name') as string;
  const language = formData.get('language') as CodeLanguageType;
  const { result } = await createSrcbook({ path, name, language: language });
  const { result: sessionResult } = await createSession({ path: result.path });
  return redirect(`/sessions/${sessionResult.id}`);
}

type HomeLoaderDataType = {
  baseDir: string;
  sessions: SessionType[];
};

function Home() {
  const { baseDir, sessions } = useLoaderData() as HomeLoaderDataType;

  const [showDelete, setShowDelete] = useState(false);
  const [srcbookDir, setSrcbookDir] = useState<string | undefined>(undefined);
  const [language, setLanguage] = useState<CodeLanguageType>('typescript');

  function onChangeLanguage(checked: boolean) {
    setLanguage(checked ? 'typescript' : 'javascript');
  }

  return (
    <>
      <DeleteSrcbookModal open={showDelete} onOpenChange={setShowDelete} srcbookDir={srcbookDir} />
      <h1 className="text-2xl mx-auto mb-8">Srcbooks</h1>
      <p>Create a new Srcbook or open an existing one</p>
      <div className="mt-4 flex items-center gap-12">
        <Form method="post" className="h-full">
          <input type="hidden" name="path" value={baseDir} />
          <input type="hidden" name="language" value={language} />
          <div className="flex items-center justify-center h-full gap-2">
            <Input placeholder="Srcbook name" required className="w-60" name="name" />
            <div className="flex items-center space-x-1">
              <LanguageLogo language={language} width={36} height={36} className="rounded" />
              <Switch checked={language === 'typescript'} onCheckedChange={onChangeLanguage} />
            </div>
            <Button className="min-w-32" type="submit">
              <div className="flex gap-2 items-center">
                Create New <PlusIcon size={16} />
              </div>
            </Button>
          </div>
        </Form>
        <p>or</p>
        <div className="flex flex-col items-center justify-center h-full">
          <Link to="/open" className="flex items-center space-x-2">
            <Button variant="outline" className="min-w-32" type="submit">
              Open
            </Button>
          </Link>
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
                      <Button
                        variant="outline"
                        className="mt-2"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSrcbookDir(session.dir);
                          setShowDelete(true);
                        }}
                      >
                        Delete
                      </Button>
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
