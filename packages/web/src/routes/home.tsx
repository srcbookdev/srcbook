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
import { ImportSrcbookModal } from '@/components/import-export-srcbook-modal';

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

const guides = [
  {
    id: 1,
    name: 'getting-started',
    title: 'Getting started',
    description: 'Quick tutorial to explore the basic concepts in Srcbooks.',
  },
  {
    id: 2,
    name: 'getting-started',
    title: 'Getting started',
    description: 'Quick tutorial to explore the basic concepts in Srcbooks.',
  },
  {
    id: 3,
    name: 'getting-started',
    title: 'Getting started',
    description: 'Quick tutorial to explore the basic concepts in Srcbooks.',
  },
];

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
  const [showImportSrcbookModal, setShowImportSrcbookModal] = useState(false);

  function onChangeLanguage(checked: boolean) {
    setLanguage(checked ? 'typescript' : 'javascript');
  }

  async function openTutorial(tutorial: string) {
    const { result } = await importSrcbook({ path: `tutorials/${tutorial}.srcmd` });
    const { result: newSession } = await createSession({ path: result.dir });

    return navigate(`/sessions/${newSession.id}`);
  }

  return (
    <div className="divide-y divide-border">
      <DeleteSrcbookModal open={showDelete} onOpenChange={setShowDelete} session={session} />
      <ImportSrcbookModal open={showImportSrcbookModal} onOpenChange={setShowImportSrcbookModal} />

      {guides.length > 0 && (
        <div className="mb-11">
          <h4 className="h4 mx-auto mb-10">Get started</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {guides.map((guide) => (
              <div
                key={guide.id}
                className="flex flex-col items-center hover:cursor-pointer hover:shadow transition-shadow"
                onClick={() => openTutorial(guide.name)}
              >
                <div className="w-full h-44 bg-border"></div>
                <div className="w-full border p-4 space-y-2">
                  <h4 className="h4">{guide.title}</h4>
                  <p className="text-sm text-tertiary-foreground">{guide.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="mb-16">
        <h4 className="h4 mx-auto my-6">New Srcbook</h4>
        <div className="mt-4 flex items-center gap-12">
          <Form method="post" className="h-full">
            <input type="hidden" name="path" value={baseDir} />
            <input type="hidden" name="language" value={language} />
            <div className="flex items-center justify-center h-full gap-2">
              <Input
                required
                name="name"
                placeholder="Srcbook name"
                autoComplete="off"
                className="w-60"
              />
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
            <Button variant="secondary" onClick={() => setShowImportSrcbookModal(true)}>
              Open
            </Button>
          </div>
        </div>
      </div>
      {sessions.length > 0 && (
        <div className="mb-16">
          <h4 className="h4 mx-auto my-6">Recent Srcbooks</h4>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
            {sessions.map((session) => {
              return (
                <div
                  key={session.id}
                  className="border border-border rounded-lg p-3 hover:bg-muted hover:shadow transition-shadow w-full"
                >
                  <Link to={`sessions/${session.id}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{(session.cells[0] as TitleCellType).text}</p>
                        <p className="text-sm text-tertiary-foreground">
                          {session.cells.length} cells
                        </p>
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
        </div>
      )}
    </div>
  );
}

Home.loader = loader;
Home.action = action;
export default Home;
