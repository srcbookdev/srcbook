import { useNavigate, useLoaderData, useRevalidator } from 'react-router-dom';
import { AppType, CodeLanguageType, TitleCellType } from '@srcbook/shared';
import {
  getConfig,
  createSession,
  loadSessions,
  createSrcbook,
  importSrcbook,
  loadSrcbookExamples,
} from '@/lib/server';
import type { ExampleSrcbookType, SessionType } from '@/types';
import { useState } from 'react';
import { ImportSrcbookModal } from '@/components/import-export-srcbook-modal';
import GenerateSrcbookModal from '@/components/generate-srcbook-modal';
import {
  MainCTACard,
  AppCard,
  SrcbookCard,
  GenerateSrcbookButton,
  CreateSrcbookButton,
  ImportSrcbookButton,
  CreateAppButton,
} from '@/components/srcbook-cards';
import DeleteSrcbookModal from '@/components/delete-srcbook-dialog';
import { ExternalLink } from 'lucide-react';
import { Button } from '@srcbook/components/src/components/ui/button';
import MailingListCard from '@/components/mailing-list-card';
import CreateAppModal from '@/components/apps/create-modal';
import { createApp, loadApps } from '@/clients/http/apps';
import DeleteAppModal from '@/components/delete-app-dialog';

export async function loader() {
  const [{ result: config }, { result: srcbooks }, { result: examples }, { data: apps }] =
    await Promise.all([getConfig(), loadSessions(), loadSrcbookExamples(), loadApps('desc')]);

  return {
    defaultLanguage: config.defaultLanguage,
    baseDir: config.baseDir,
    srcbooks,
    examples,
    config,
    apps,
  };
}

type HomeLoaderDataType = {
  apps: AppType[];
  baseDir: string;
  srcbooks: SessionType[];
  examples: ExampleSrcbookType[];
  defaultLanguage: CodeLanguageType;
};

export default function Home() {
  const { apps, defaultLanguage, baseDir, srcbooks, examples } =
    useLoaderData() as HomeLoaderDataType;
  const navigate = useNavigate();

  const { revalidate } = useRevalidator();

  const [showImportSrcbookModal, setShowImportSrcbookModal] = useState(false);
  const [showGenSrcbookModal, setShowGenSrcbookModal] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [srcbookToDelete, setSrcbookToDelete] = useState<SessionType | undefined>(undefined);

  const [appToDelete, setAppToDelete] = useState<AppType | null>(null);
  const [showCreateAppModal, setShowCreateAppModal] = useState(false);

  function onDeleteSrcbook(srcbook: SessionType) {
    setSrcbookToDelete(srcbook);
    setShowDelete(true);
  }

  async function openSrcbook(path: string) {
    const { result: srcbook } = await createSession({ path });
    navigate(`/srcbooks/${srcbook.id}`);
  }

  async function onCreateSrcbook(language: CodeLanguageType) {
    const { result } = await createSrcbook({ path: baseDir, name: 'Untitled', language: language });
    openSrcbook(result.path);
  }

  async function onCreateApp(name: string, prompt?: string) {
    const { data: app } = await createApp({ name, prompt });
    navigate(`/apps/${app.id}`);
  }

  async function openExampleSrcbook(example: ExampleSrcbookType) {
    const { result } = await importSrcbook({ path: example.path });
    openSrcbook(result.dir);
  }

  return (
    <div className="divide-y divide-border space-y-8 pb-10">
      {showCreateAppModal && (
        <CreateAppModal onClose={() => setShowCreateAppModal(false)} onCreate={onCreateApp} />
      )}
      {appToDelete && (
        <DeleteAppModal
          app={appToDelete}
          onClose={() => setAppToDelete(null)}
          onDeleted={() => {
            revalidate();
            setAppToDelete(null);
          }}
        />
      )}
      <DeleteSrcbookModal
        open={showDelete}
        onOpenChange={setShowDelete}
        session={srcbookToDelete}
      />
      <GenerateSrcbookModal
        open={showGenSrcbookModal}
        setOpen={setShowGenSrcbookModal}
        openSrcbook={openSrcbook}
      />
      <ImportSrcbookModal open={showImportSrcbookModal} onOpenChange={setShowImportSrcbookModal} />

      <div>
        <h4 className="h4 mx-auto mb-6">Apps</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          <CreateAppButton
            defaultLanguage={defaultLanguage}
            onClick={() => setShowCreateAppModal(true)}
          />
          {apps.map((app) => (
            <AppCard
              key={app.id}
              name={app.name}
              onClick={() => navigate(`/apps/${app.id}`)}
              onDelete={() => setAppToDelete(app)}
            />
          ))}
        </div>
      </div>

      <div>
        <h4 className="h4 mx-auto mt-8 mb-6">New Notebook</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          <CreateSrcbookButton defaultLanguage={defaultLanguage} onSubmit={onCreateSrcbook} />
          <GenerateSrcbookButton onClick={() => setShowGenSrcbookModal(true)} />
          <ImportSrcbookButton onClick={() => setShowImportSrcbookModal(true)} />
        </div>
      </div>

      {srcbooks.length > 0 && (
        <div>
          <h4 className="h4 mx-auto mt-8 mb-6">Your Notebooks</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {srcbooks
              .sort((a, b) => b.openedAt - a.openedAt)
              .map((srcbook) => (
                <SrcbookCard
                  key={srcbook.id}
                  title={(srcbook.cells[0] as TitleCellType).text}
                  running={srcbook.cells.some((c) => c.type === 'code' && c.status === 'running')}
                  language={srcbook.language}
                  cellCount={srcbook.cells.length}
                  onClick={() => navigate(`/srcbooks/${srcbook.id}`)}
                  onDelete={() => onDeleteSrcbook(srcbook)}
                />
              ))}
          </div>
        </div>
      )}

      {examples.length > 0 && (
        <div>
          <h4 className="h4 mt-8 mb-6">Explore</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {examples.map((example) => (
              <MainCTACard
                key={example.id}
                srcbook={example}
                onClick={() => openExampleSrcbook(example)}
              />
            ))}
          </div>

          <div className="mt-8 flex justify-center">
            <a href="https://hub.srcbook.com" target="_blank">
              <Button size="lg" variant="secondary">
                <span className="mr-1.5">Explore all in the Hub</span>
                <ExternalLink size={16} />
              </Button>
            </a>
          </div>
        </div>
      )}
      <MailingListCard />
    </div>
  );
}
