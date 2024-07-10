import { useNavigate, useLoaderData } from 'react-router-dom';
import { CodeLanguageType, TitleCellType } from '@srcbook/shared';
import {
  getConfig,
  createSession,
  loadSessions,
  createSrcbook,
  importSrcbook,
  generateSrcbook,
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
  ImportSrcbookCTA,
} from '@/components/srcbook-cards';
import DeleteSrcbookModal from '@/components/delete-srcbook-dialog';

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
    hasOpenAiKey: !!config.openAiApiKey,
  };
}

type HomeLoaderDataType = {
  baseDir: string;
  srcbooks: SessionType[];
  examples: ExampleSrcbookType[];
  defaultLanguage: CodeLanguageType;
  hasOpenAiKey: boolean;
};

export default function Home() {
  const { defaultLanguage, baseDir, srcbooks, examples, hasOpenAiKey } =
    useLoaderData() as HomeLoaderDataType;
  const navigate = useNavigate();

  const [showImportSrcbookModal, setShowImportSrcbookModal] = useState(false);
  const [showGenSrcbookModal, setShowGenSrcbookModal] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [srcbookToDelete, setSrcbookToDelete] = useState<SessionType | undefined>(undefined);

  function onDeleteSrcbook(srcbook: SessionType) {
    setSrcbookToDelete(srcbook);
    setShowDelete(true);
  }

  async function onCreateSrcbook(language: CodeLanguageType) {
    const { result } = await createSrcbook({ path: baseDir, name: 'Untitled', language: language });
    const { result: srcbook } = await createSession({ path: result.path });
    return navigate(`/srcbooks/${srcbook.id}`);
  }

  async function openExampleSrcbook(example: ExampleSrcbookType) {
    const { result } = await importSrcbook({ path: example.path });
    const { result: srcbook } = await createSession({ path: result.dir });
    return navigate(`/srcbooks/${srcbook.id}`);
  }

  async function onGenerateSrcbook(query: string) {
    // TODO error handling. This is DEFINITELY not 100%
    const { result, error } = await generateSrcbook({ query });
    if (error === true) {
      return result;
    }
    const { result: srcbook } = await createSession({ path: result.dir });
    return navigate(`/srcbooks/${srcbook.id}`);
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
        onGenerate={onGenerateSrcbook}
        hasOpenAiKey={hasOpenAiKey}
      />
      <ImportSrcbookModal open={showImportSrcbookModal} onOpenChange={setShowImportSrcbookModal} />

      {examples.length > 0 && (
        <div className="mb-11">
          <h4 className="h4 mx-auto mb-6">Library</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {examples.map((example) => (
              <MainCTACard
                key={example.id}
                title={example.title}
                description={example.description}
                onClick={() => openExampleSrcbook(example)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="mb-16">
        <h4 className="h4 mx-auto my-6">New Srcbook</h4>
        <div className="grid grid-cols-2 sm:flex gap-6">
          <CreateSrcbookButton defaultLanguage={defaultLanguage} onSubmit={onCreateSrcbook} />
          <GenerateSrcbookButton onClick={() => setShowGenSrcbookModal(true)} />
          <ImportSrcbookCTA onClick={() => setShowImportSrcbookModal(true)} />
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
                  language={srcbook.metadata.language}
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
