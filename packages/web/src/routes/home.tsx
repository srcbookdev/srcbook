import { PlusIcon } from 'lucide-react';
import { Form, useLoaderData, useNavigate, redirect, Link } from 'react-router-dom';
import { CodeLanguageType, TitleCellType } from '@srcbook/shared';
import DeleteSrcbookModal from '@/components/delete-srcbook-dialog';
import { getConfig, createSession, loadSessions, createSrcbook, importSrcbook } from '@/lib/server';
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
  return { defaultLanguage: config.defaultLanguage, baseDir: config.baseDir, sessions };
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
  defaultLanguage: CodeLanguageType;
};

function Home() {
  const { defaultLanguage, baseDir, sessions } = useLoaderData() as HomeLoaderDataType;
  const navigate = useNavigate();

  const [showDelete, setShowDelete] = useState(false);
  const [session, setSession] = useState<SessionType | undefined>(undefined);
  const [language, setLanguage] = useState<CodeLanguageType>(defaultLanguage);

  function onChangeLanguage(checked: boolean) {
    setLanguage(checked ? 'typescript' : 'javascript');
  }

  async function openTutorial(tutorial: string) {
    const { result } = await importSrcbook({ path: `tutorials/${tutorial}.srcmd` });
    const { result: newSession } = await createSession({ path: result.dir });

    return navigate(`/sessions/${newSession.id}`);
  }

  return (
    <>
      <DeleteSrcbookModal open={showDelete} onOpenChange={setShowDelete} session={session} />
      <h1 className="text-2xl mx-auto mb-8">Get started</h1>
      <div className="flex gap-4">
        <div
          className="flex flex-col items-center hover:cursor-pointer"
          onClick={() => openTutorial('getting-started')}
        >
          <div className="w-48 h-24 bg-sb-core-90 w-full"></div>
          <div className="w-48 border flex flex-col p-2 gap-2">
            <h3 className="font-bold text-xl">Getting started</h3>
            <p className="text-xs">Understand the basic concepts of srcbooks.</p>
          </div>
        </div>
      </div>
      <h1 className="text-2xl mx-auto my-8">Srcbooks</h1>
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
            <Button size="default-with-icon">
              <PlusIcon size={16} /> Create New
            </Button>
          </div>
        </Form>
        <p>or</p>
        <div className="flex flex-col items-center justify-center h-full">
          <Link to="/open" className="flex items-center space-x-2">
            <Button variant="secondary" type="submit">
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
                        variant="secondary"
                        className="mt-2"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSession(session);
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
