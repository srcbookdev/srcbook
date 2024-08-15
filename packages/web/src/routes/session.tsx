import { useEffect, useRef, useState } from 'react';
import { useLoaderData, type LoaderFunctionArgs } from 'react-router-dom';
import {
  CellType,
  CellOutputPayloadType,
  CellUpdatedPayloadType,
  CellUpdateAttrsType,
  TsServerCellDiagnosticsPayloadType,
  CodeLanguageType,
  MarkdownCellType,
  CodeCellType,
  TitleCellType,
} from '@srcbook/shared';
import { loadSession, getConfig } from '@/lib/server';
import type { SessionType, GenerateAICellType, SettingsType } from '@/types';
import TitleCell from '@/components/cells/title';
import MarkdownCell from '@/components/cells/markdown';
import GenerateAiCell from '@/components/cells/generate-ai';
import CodeCell from '@/components/cells/code';
import SessionMenu from '@/components/session-menu';
import { Button } from '@/components/ui/button';
import { SessionChannel } from '@/clients/websocket';
import { CellsProvider, useCells } from '@/components/use-cell';
import useEffectOnce from '@/components/use-effect-once';
import { cn } from '@/lib/utils';
import { useHotkeys } from 'react-hotkeys-hook';
import InstallPackageModal from '@/components/install-package-modal';
import { PackageJsonProvider, usePackageJson } from '@/components/use-package-json';
import { toast } from 'sonner';
import { TsConfigProvider } from '@/components/use-tsconfig-json';

async function loader({ params }: LoaderFunctionArgs) {
  const [{ result: config }, { result: session }] = await Promise.all([
    getConfig(),
    loadSession({ id: params.id! }),
  ]);

  return { config, session };
}

function SessionPage() {
  const { session, config } = useLoaderData() as { session: SessionType; config: SettingsType };

  const channelRef = useRef(SessionChannel.create(session.id));
  const channel = channelRef.current;

  useEffectOnce(() => {
    channel.subscribe();

    if (session.language === 'typescript') {
      channel.push('tsserver:start', { sessionId: session.id });
    }

    return () => {
      channel.unsubscribe();

      if (session.language === 'typescript') {
        channel.push('tsserver:stop', { sessionId: session.id });
      }
    };
  });

  return (
    <CellsProvider initialCells={session.cells}>
      <PackageJsonProvider session={session} channel={channel}>
        <TsConfigProvider session={session} channel={channel}>
          <Session session={session} channel={channelRef.current} config={config} />
        </TsConfigProvider>
      </PackageJsonProvider>
    </CellsProvider>
  );
}

function Session(props: { session: SessionType; channel: SessionChannel; config: SettingsType }) {
  const { session, channel } = props;

  const {
    cells: allCells,
    updateCell,
    removeCell,
    createCodeCell,
    createMarkdownCell,
    createGenerateAiCell,
    setOutput,
    setTsServerDiagnostics,
  } = useCells();

  const { installing: installingDependencies } = usePackageJson();

  const [depsInstallModalOpen, setDepsInstallModalOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useHotkeys('mod+;', () => {
    if (!showSettings) {
      setShowSettings(true);
    }
  });

  async function onDeleteCell(cell: CellType | GenerateAICellType) {
    if (cell.type !== 'code' && cell.type !== 'markdown') {
      throw new Error(`Cannot delete cell of type '${cell.type}'`);
    }

    // Optimistically delete cell
    removeCell(cell);

    channel.push('cell:delete', {
      sessionId: session.id,
      cellId: cell.id,
    });
  }

  useEffect(() => {
    const callback = (payload: CellOutputPayloadType) => {
      setOutput(payload.cellId, payload.output);
    };

    channel.on('cell:output', callback);

    return () => channel.off('cell:output', callback);
  }, [channel, setOutput]);

  useEffect(() => {
    const callback = (payload: TsServerCellDiagnosticsPayloadType) => {
      setTsServerDiagnostics(payload.cellId, payload.diagnostics);
    };

    channel.on('tsserver:cell:diagnostics', callback);

    return () => channel.off('tsserver:cell:diagnostics', callback);
  }, [channel, setTsServerDiagnostics]);

  useEffect(() => {
    const callback = (payload: CellUpdatedPayloadType) => {
      updateCell(payload.cell);
    };

    channel.on('cell:updated', callback);

    return () => channel.off('cell:updated', callback);
  }, [channel, updateCell]);

  function updateCellOnServer(cell: CellType, updates: CellUpdateAttrsType) {
    channel.push('cell:update', {
      sessionId: session.id,
      cellId: cell.id,
      updates,
    });
  }

  async function createNewCell(type: 'code' | 'markdown' | 'generate-ai', index: number) {
    // First, create the cell on client.
    // Then, push state to server, _only_ for code or markdown cells. AI generation is a client side only cell.
    // TODO: Handle potential errors (eg, rollback optimistic client creation if there are errors)
    let cell;
    switch (type) {
      case 'code':
        cell = createCodeCell(index, session.language);
        channel.push('cell:create', { sessionId: session.id, index, cell });
        break;
      case 'markdown':
        cell = createMarkdownCell(index);
        channel.push('cell:create', { sessionId: session.id, index, cell });
        break;
      case 'generate-ai':
        cell = createGenerateAiCell(index);
        break;
    }
  }

  async function insertGeneratedCells(idx: number, cells: Array<CodeCellType | MarkdownCellType>) {
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const insertIdx = idx + i;
      let newCell;
      switch (cell.type) {
        case 'code':
          newCell = createCodeCell(insertIdx, session.language, cell);
          break;
        case 'markdown':
          newCell = createMarkdownCell(insertIdx, cell);
          break;
      }
      channel.push('cell:create', { sessionId: session.id, index: insertIdx, cell: newCell });
    }
  }

  // TOOD: We need to stop treating titles and package.json as cells.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [titleCell, _packageJsonCell, ...remainingCells] = allCells;
  const cells = remainingCells as (MarkdownCellType | CodeCellType | GenerateAICellType)[];

  useEffect(() => {
    if (installingDependencies && !depsInstallModalOpen) {
      const toastId = toast.loading('Installing dependencies...');
      return () => toast.dismiss(toastId);
    } else {
      return () => {};
    }
  }, [installingDependencies, depsInstallModalOpen]);

  return (
    <>
      <PackageInstallModal open={depsInstallModalOpen} onOpenChange={setDepsInstallModalOpen} />
      <SessionMenu
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        session={session}
        openDepsInstallModal={() => setDepsInstallModalOpen(true)}
        channel={channel}
      />

      {/* At the xl breakpoint, the sessionMenu appears inline so we pad left to balance*/}
      <div className="px-[72px] xl:pl-[100px] pb-28">
        <TitleCell cell={titleCell as TitleCellType} updateCellOnServer={updateCellOnServer} />

        {cells.map((cell, idx) => (
          <div key={cell.id}>
            <InsertCellDivider
              language={session.language}
              createCodeCell={() => createNewCell('code', idx + 2)}
              createMarkdownCell={() => createNewCell('markdown', idx + 2)}
              createGenerateAiCodeCell={() => createNewCell('generate-ai', idx + 2)}
            />

            {cell.type === 'code' && (
              <CodeCell
                cell={cell}
                session={session}
                channel={channel}
                updateCellOnServer={updateCellOnServer}
                onDeleteCell={onDeleteCell}
              />
            )}

            {cell.type === 'markdown' && (
              <MarkdownCell
                cell={cell}
                updateCellOnServer={updateCellOnServer}
                onDeleteCell={onDeleteCell}
              />
            )}

            {cell.type === 'generate-ai' && (
              <GenerateAiCell
                cell={cell}
                session={session}
                insertIdx={idx + 2}
                onSuccess={insertGeneratedCells}
              />
            )}
          </div>
        ))}

        {/* There is always an insert cell divider after the last cell */}
        <InsertCellDivider
          language={session.language}
          createCodeCell={() => createNewCell('code', allCells.length)}
          createMarkdownCell={() => createNewCell('markdown', allCells.length)}
          createGenerateAiCodeCell={() => createNewCell('generate-ai', allCells.length)}
          className={cn('h-14', cells.length === 0 && 'opacity-100')}
        />
      </div>
    </>
  );
}

function InsertCellDivider(props: {
  createCodeCell: () => void;
  createMarkdownCell: () => void;
  createGenerateAiCodeCell: () => void;
  language: CodeLanguageType;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'h-5 relative z-10 opacity-0 hover:opacity-100 transition-opacity',
        props.className,
      )}
    >
      <div className="h-full px-3 flex flex-col justify-center">
        <div className="w-full h-[1px] bg-border"></div>
      </div>

      <div className="absolute top-0 w-full h-full flex items-center justify-center">
        <div className="flex mr-4 border rounded-md bg-background shadow">
          <Button
            variant="secondary"
            className="border-none rounded-md rounded-r-none"
            onClick={props.createCodeCell}
          >
            {props.language === 'javascript' ? 'JavaScript' : 'TypeScript'}
          </Button>
          <Button
            variant="secondary"
            className="border-none rounded-md rounded-l-none"
            onClick={props.createMarkdownCell}
          >
            Markdown
          </Button>
          <Button
            variant="secondary"
            className="border-none rounded-md rounded-l-none"
            onClick={props.createGenerateAiCodeCell}
          >
            Generate with AI
          </Button>
        </div>
      </div>
    </div>
  );
}

function PackageInstallModal(props: { open: boolean; onOpenChange: (value: boolean) => void }) {
  const { open, onOpenChange } = props;

  useHotkeys('mod+i', () => {
    if (!open) {
      onOpenChange(true);
    }
  });

  return <InstallPackageModal open={open} setOpen={onOpenChange} />;
}

SessionPage.loader = loader;
export default SessionPage;
