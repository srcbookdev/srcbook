import { useLoaderData, useNavigate } from 'react-router-dom';
import { CodeLanguageType, TitleCellType } from '@srcbook/shared';
import { getConfig, createSession, loadSessions, createSrcbook, importSrcbook } from '@/lib/server';
import type { SessionType } from '@/types';
import { useState } from 'react';
import { ImportSrcbookModal } from '@/components/import-export-srcbook-modal';
import { CreateSrcbookForm, ImportSrcbookCTA, SrcbookCard } from '@/components/srcbook-cards';
import DeleteSrcbookModal from '@/components/delete-srcbook-dialog';

export async function loader() {
  const { result: config } = await getConfig();
  const { result: sessions } = await loadSessions();
  return { defaultLanguage: config.defaultLanguage, baseDir: config.baseDir, sessions };
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
    name: 'langgraph-web-agent',
    title: 'LangGraph agent',
    description: 'Learn to write a stateful agent with  emory using langgraph and tavily.',
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

export default function Home() {
  const { defaultLanguage, baseDir, sessions } = useLoaderData() as HomeLoaderDataType;
  const navigate = useNavigate();

  const [showImportSrcbookModal, setShowImportSrcbookModal] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [session, setSession] = useState<SessionType | undefined>(undefined);

  function onDeleteSession(session: SessionType) {
    setSession(session);
    setShowDelete(true);
  }

  async function onCreateSrcbook(title: string, language: CodeLanguageType) {
    const { result } = await createSrcbook({ path: baseDir, name: title, language: language });
    const { result: sessionResult } = await createSession({ path: result.path });
    return navigate(`/sessions/${sessionResult.id}`);
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
                <div className="w-full grow h-44 bg-border"></div>
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
        <div className="grid grid-cols-2 sm:flex gap-6">
          <CreateSrcbookForm defaultLanguage={defaultLanguage} onSubmit={onCreateSrcbook} />
          <ImportSrcbookCTA onClick={() => setShowImportSrcbookModal(true)} />
        </div>
      </div>
      {sessions.length > 0 && (
        <div className="mb-16">
          <h4 className="h4 mx-auto my-6">Recent Srcbooks</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {sessions.map((session) => (
              <SrcbookCard
                key={session.id}
                title={(session.cells[0] as TitleCellType).text}
                running={session.cells.some((c) => c.type === 'code' && c.status === 'running')}
                language={session.metadata.language}
                cellCount={session.cells.length}
                onClick={() => navigate(`/sessions/${session.id}`)}
                onDelete={() => onDeleteSession(session)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
