import { useNavigate, useLoaderData } from 'react-router-dom';
import { CodeLanguageType, TitleCellType } from '@srcbook/shared';
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
  SrcbookCard,
  GenerateSrcbookButton,
  CreateSrcbookButton,
  ImportSrcbookButton,
} from '@/components/srcbook-cards';
import DeleteSrcbookModal from '@/components/delete-srcbook-dialog';
import { ExternalLink } from 'lucide-react';

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

type HomeLoaderDataType = {
  baseDir: string;
  srcbooks: SessionType[];
  examples: ExampleSrcbookType[];
  defaultLanguage: CodeLanguageType;
};

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
    const { result } = await createSrcbook({ path: baseDir, name: 'Untitled', language: language });
    openSrcbook(result.path);
  }

  async function openExampleSrcbook(example: ExampleSrcbookType) {
    const { result } = await importSrcbook({ path: example.path });
    openSrcbook(result.dir);
  }

  return (
    <div className="divide-y divide-border">
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

      {examples.length > 0 && (
        <div className="mb-11">
          <h4 className="h4 mb-6">Library</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {examples.map((example) => (
              <MainCTACard
                key={example.id}
                srcbook={example}
                onClick={() => openExampleSrcbook(example)}
              />
            ))}
          </div>

          <a href="https://hub.srcbook.com" target="_blank">
            <div className="flex gap-2 items-center mt-6 hover:-translate-y-0.5 transition-all">
              <p className="px-2">
                See more examples in <span className="underline font-medium">the hub</span>
              </p>
              <ExternalLink size={16} className="text-muted-foreground" />
            </div>
          </a>
        </div>
      )}

      <div className="mb-16">
        <h4 className="h4 mx-auto my-6">New Srcbook</h4>
        <div className="grid grid-cols-2 sm:flex gap-6">
          <CreateSrcbookButton defaultLanguage={defaultLanguage} onSubmit={onCreateSrcbook} />
          <GenerateSrcbookButton onClick={() => setShowGenSrcbookModal(true)} />
          <ImportSrcbookButton onClick={() => setShowImportSrcbookModal(true)} />
        </div>
      </div>

      {srcbooks.length > 0 && (
        <div className="mb-16">
          <h4 className="h4 mx-auto my-6">Recent Srcbooks</h4>
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
    </div>
  );
}
