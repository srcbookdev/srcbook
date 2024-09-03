import { useNavigate, useLoaderData } from 'react-router-dom';
import type { CodeLanguageType, TitleCellType } from '@srcbook/shared';
import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import {
  getConfig,
  createSession,
  loadSessions,
  createSrcbook,
  importSrcbook,
  loadSrcbookExamples,
} from '@/lib/server';
import type { ExampleSrcbookType, SessionType } from '@/types';
import { ImportSrcbookModal } from '@/components/import-export-srcbook-modal';
import GenerateSrcbookModal from '@/components/generate-srcbook-modal';
import {
  MainCTACard,
  SrcbookCard,
  GenerateSrcbookButton,
  CreateSrcbookButton,
  ImportSrcbookButton,
} from '@/components/srcbook-cards';
import DeleteSrcbookModal from '@/components/delete-srcbook-dialog';
import { Button } from '@/components/ui/button';

export async function loader() {
  const [{ result: config }, { result: srcbooks }, { result: examples }] = await Promise.all([
    getConfig(),
    loadSessions(),
    loadSrcbookExamples(),
  ]);

  return {
    defaultLanguage: config.defaultLanguage,
    baseDir: config.baseDir,
    srcbooks,
    examples,
    config,
  };
}

interface HomeLoaderDataType {
  baseDir: string;
  srcbooks: SessionType[];
  examples: ExampleSrcbookType[];
  defaultLanguage: CodeLanguageType;
}

export default function Home() {
  const { defaultLanguage, baseDir, srcbooks, examples } = useLoaderData() as HomeLoaderDataType;
  const navigate = useNavigate();

  const [showImportSrcbookModal, setShowImportSrcbookModal] = useState(false);
  const [showGenSrcbookModal, setShowGenSrcbookModal] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [srcbookToDelete, setSrcbookToDelete] = useState<SessionType | undefined>(undefined);

  function onDeleteSrcbook(srcbook: SessionType) {
    setSrcbookToDelete(srcbook);
    setShowDelete(true);
  }

  async function openSrcbook(path: string) {
    const { result: srcbook } = await createSession({ path });
    navigate(`/srcbooks/${srcbook.id}`);
  }

  async function onCreateSrcbook(language: CodeLanguageType) {
    const { result } = await createSrcbook({ path: baseDir, name: 'Untitled', language });
    openSrcbook(result.path);
  }

  async function openExampleSrcbook(example: ExampleSrcbookType) {
    const { result } = await importSrcbook({ path: example.path });
    openSrcbook(result.dir);
  }

  return (
    <div className="divide-y divide-border space-y-8 pb-10">
      <DeleteSrcbookModal
        onOpenChange={setShowDelete}
        open={showDelete}
        session={srcbookToDelete}
      />
      <GenerateSrcbookModal
        open={showGenSrcbookModal}
        openSrcbook={openSrcbook}
        setOpen={setShowGenSrcbookModal}
      />
      <ImportSrcbookModal onOpenChange={setShowImportSrcbookModal} open={showImportSrcbookModal} />

      <div>
        <h4 className="h4 mx-auto my-6">New Srcbook</h4>
        <div className="grid grid-cols-2 sm:flex gap-6">
          <CreateSrcbookButton defaultLanguage={defaultLanguage} onSubmit={onCreateSrcbook} />
          <GenerateSrcbookButton onClick={() => { setShowGenSrcbookModal(true); }} />
          <ImportSrcbookButton onClick={() => { setShowImportSrcbookModal(true); }} />
        </div>
      </div>

      {srcbooks.length > 0 && (
        <div>
          <h4 className="h4 mx-auto my-6">Recent Srcbooks</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {srcbooks
              .sort((a, b) => b.openedAt - a.openedAt)
              .map((srcbook) => (
                <SrcbookCard
                  cellCount={srcbook.cells.length}
                  key={srcbook.id}
                  language={srcbook.language}
                  onClick={() => { navigate(`/srcbooks/${srcbook.id}`); }}
                  onDelete={() => { onDeleteSrcbook(srcbook); }}
                  running={srcbook.cells.some((c) => c.type === 'code' && c.status === 'running')}
                  title={(srcbook.cells[0] as TitleCellType).text}
                />
              ))}
          </div>
        </div>
      )}

      {examples.length > 0 && (
        <div>
          <h4 className="h4 my-6">Explore</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {examples.map((example) => (
              <MainCTACard
                key={example.id}
                onClick={() => openExampleSrcbook(example)}
                srcbook={example}
              />
            ))}
          </div>

          <div className="mt-8 flex justify-center">
            <a href="https://hub.srcbook.com" rel="noopener" target="_blank">
              <Button size="lg" variant="secondary">
                <span className="mr-1.5">Explore all in the Hub</span>
                <ExternalLink size={16} />
              </Button>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
