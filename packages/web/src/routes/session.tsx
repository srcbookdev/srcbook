import { useEffect, useRef, useState } from 'react';
import { useLoaderData, type LoaderFunctionArgs } from 'react-router-dom';
import { toast } from 'sonner';
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
  DepsValidateResponsePayloadType,
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

    // TODO: Push once we know subscription succeeded
    channel.push('deps:validate', { sessionId: session.id });

    if (session.metadata.language === 'typescript') {
      channel.push('tsserver:start', { sessionId: session.id });
    }

    return () => {
      channel.unsubscribe();

      if (session.metadata.language === 'typescript') {
        channel.push('tsserver:stop', { sessionId: session.id });
      }
    };
  });

  return (
    <CellsProvider initialCells={session.cells}>
      <Session session={session} channel={channelRef.current} config={config} />
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

  const [depsInstallModalOpen, setDepsInstallModalOpen] = useState(false);

  async function onDeleteCell(cell: CellType | GenerateAICellType) {
    if (cell.type === 'title') {
      throw new Error('Cannot delete title cell');
    }

    // Optimistically delete cell
    removeCell(cell);

    channel.push('cell:delete', {
      sessionId: session.id,
      cellId: cell.id,
    });
  }

  function npmInstall(packages?: Array<string>) {
    channel.push('deps:install', { sessionId: session.id, packages });
  }

  useEffect(() => {
    const callback = (payload: DepsValidateResponsePayloadType) => {
      const { packages } = payload;
      const msg = packages
        ? `Missing dependencies: ${packages.join(', ')}`
        : 'Packages need to be installed';
      toast.warning(msg, {
        duration: 10000,
        action: {
          label: 'Install',
          onClick: () => npmInstall(packages),
        },
      });
    };

    channel.on('deps:validate:response', callback);
    return () => channel.off('deps:validate:response', callback);
  }, [channel, npmInstall]);

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
        cell = createCodeCell(index, session.metadata.language);
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
          newCell = createCodeCell(insertIdx, session.metadata.language, cell);
          break;
        case 'markdown':
          newCell = createMarkdownCell(insertIdx, cell);
          break;
      }
      channel.push('cell:create', { sessionId: session.id, index: insertIdx, cell: newCell });
    }
  }

  // TOOD: We need to stop treating titles and package.json as cells.
  const [titleCell, _packageJsonCell, ...remainingCells] = allCells;
  const cells = remainingCells as (MarkdownCellType | CodeCellType | GenerateAICellType)[];

  return (
    <>
      <PackageInstallModal
        open={depsInstallModalOpen}
        onOpenChange={setDepsInstallModalOpen}
        channel={channel}
        session={session}
      />

      <SessionMenu
        openDepsInstallModal={() => setDepsInstallModalOpen(true)}
        session={session}
        channel={channel}
      />

      {/* At the xl breakpoint, the sessionMenu appears inline so we pad left to balance*/}
      <div className="px-[72px] xl:pl-[100px] pb-28">
        <TitleCell cell={titleCell as TitleCellType} updateCellOnServer={updateCellOnServer} />

        {cells.map((cell, idx) => (
          <div key={cell.id}>
            <InsertCellDivider
              language={session.metadata.language}
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
                hasOpenaiKey={!!props.config.openaiKey}
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
                hasOpenaiKey={!!props.config.openaiKey}
              />
            )}
          </div>
        ))}

        {/* There is always an insert cell divider after the last cell */}
        <InsertCellDivider
          language={session.metadata.language}
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

function PackageInstallModal(props: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  channel: SessionChannel;
  session: SessionType;
}) {
  const { open, onOpenChange, channel, session } = props;

  useHotkeys('meta+i', () => {
    if (!open) {
      onOpenChange(true);
    }
  });

  return (
    <InstallPackageModal channel={channel} session={session} open={open} setOpen={onOpenChange} />
  );
}

SessionPage.loader = loader;
export default SessionPage;
