import { useEffect, useRef, useState } from 'react';
import { useLoaderData, type LoaderFunctionArgs } from 'react-router-dom';
import type {
  CellType,
  CellOutputPayloadType,
  CellUpdatedPayloadType,
  CellUpdateAttrsType,
  TsServerCellDiagnosticsPayloadType,
  CodeLanguageType,
  MarkdownCellType,
  CodeCellType,
  TitleCellType,
  TsServerCellSuggestionsPayloadType,
} from '@srcbook/shared';
import { useHotkeys } from 'react-hotkeys-hook';
import { toast } from 'sonner';
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
import InstallPackageModal from '@/components/install-package-modal';
import { PackageJsonProvider, usePackageJson } from '@/components/use-package-json';
import { TsConfigProvider } from '@/components/use-tsconfig-json';

async function loader({ params }: LoaderFunctionArgs) {
  const [{ result: config }, { result: session }] = await Promise.all([
    getConfig(),
    loadSession({ id: params.id! }),
  ]);

  return { config, session };
}

function SessionPage(): JSX.Element {
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
      <PackageJsonProvider channel={channel} session={session}>
        <TsConfigProvider channel={channel} session={session}>
          <Session channel={channelRef.current} config={config} session={session} />
        </TsConfigProvider>
      </PackageJsonProvider>
    </CellsProvider>
  );
}

function Session(props: {
  session: SessionType;
  channel: SessionChannel;
  config: SettingsType;
}): JSX.Element {
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
    setTsServerSuggestions,
  } = useCells();

  const {
    npmInstall,
    failed: dependencyInstallFailed,
    outdated: dependenciesOutdated,
    installing: installingDependencies,
  } = usePackageJson();

  const [depsInstallModalOpen, setDepsInstallModalOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useHotkeys('mod+;', () => {
    if (!showSettings) {
      setShowSettings(true);
    }
  });

  function onDeleteCell(cell: CellType | GenerateAICellType): void {
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
    const callback = (payload: CellOutputPayloadType): void => {
      setOutput(payload.cellId, payload.output);
    };

    channel.on('cell:output', callback);

    return () => {
      channel.off('cell:output', callback);
    };
  }, [channel, setOutput]);

  useEffect(() => {
    const callback = (payload: TsServerCellDiagnosticsPayloadType): void => {
      setTsServerDiagnostics(payload.cellId, payload.diagnostics);
    };

    channel.on('tsserver:cell:diagnostics', callback);

    return () => {
      channel.off('tsserver:cell:diagnostics', callback);
    };
  }, [channel, setTsServerDiagnostics]);

  useEffect(() => {
    const callback = (payload: TsServerCellSuggestionsPayloadType): void => {
      setTsServerSuggestions(payload.cellId, payload.diagnostics);
    };

    channel.on('tsserver:cell:suggestions', callback);

    return () => {
      channel.off('tsserver:cell:suggestions', callback);
    };
  }, [channel, setTsServerSuggestions]);

  useEffect(() => {
    const callback = (payload: CellUpdatedPayloadType): void => {
      updateCell(payload.cell);
    };

    channel.on('cell:updated', callback);

    return () => {
      channel.off('cell:updated', callback);
    };
  }, [channel, updateCell]);

  function updateCellOnServer(cell: CellType, updates: CellUpdateAttrsType): void {
    channel.push('cell:update', {
      sessionId: session.id,
      cellId: cell.id,
      updates,
    });
  }

  function createNewCell(type: 'code' | 'markdown' | 'generate-ai', index: number): void {
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

  function insertGeneratedCells(idx: number, cells: (CodeCellType | MarkdownCellType)[]): void {
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      if (!cell) continue;
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
  const [titleCell, _packageJsonCell, ...remainingCells] = allCells;
  const cells = remainingCells as (MarkdownCellType | CodeCellType | GenerateAICellType)[];

  useEffect(() => {
    let result: () => void = () => {};

    if (depsInstallModalOpen || showSettings) {
      return result;
    }

    if (installingDependencies) {
      const toastId = toast.loading('Installing dependencies...');
      result = () => toast.dismiss(toastId);
    } else if (dependencyInstallFailed) {
      const toastId = toast.error('Failed to install dependencies', {
        duration: 10000,
        action: {
          label: 'Try again',
          onClick: () => {
            setShowSettings(true);
            setTimeout(npmInstall, 100);
          },
        },
      });
      result = () => toast.dismiss(toastId);
    } else if (dependenciesOutdated) {
      toast.warning('Packages need to be installed', {
        duration: 10000,
        action: {
          label: 'Install',
          onClick: () => {
            npmInstall();
          },
        },
      });
    }

    return result;
  }, [
    dependenciesOutdated,
    installingDependencies,
    dependencyInstallFailed,
    showSettings,
    depsInstallModalOpen,
    npmInstall,
  ]);

  return (
    <>
      <PackageInstallModal onOpenChange={setDepsInstallModalOpen} open={depsInstallModalOpen} />
      <SessionMenu
        channel={channel}
        openDepsInstallModal={() => {
          setDepsInstallModalOpen(true);
        }}
        session={session}
        setShowSettings={setShowSettings}
        showSettings={showSettings}
      />

      {/* At the xl breakpoint, the sessionMenu appears inline so we pad left to balance*/}
      <div className="px-[72px] xl:pl-[100px] pb-28">
        <TitleCell cell={titleCell as TitleCellType} updateCellOnServer={updateCellOnServer} />

        {cells.map((cell, idx) => (
          <div key={cell.id}>
            <InsertCellDivider
              createCodeCell={() => {
                createNewCell('code', idx + 2);
              }}
              createGenerateAiCodeCell={() => {
                createNewCell('generate-ai', idx + 2);
              }}
              createMarkdownCell={() => {
                createNewCell('markdown', idx + 2);
              }}
              language={session.language}
            />

            {cell.type === 'code' && (
              <CodeCell
                cell={cell}
                channel={channel}
                onDeleteCell={() => {
                  onDeleteCell(cell);
                }}
                session={session}
                updateCellOnServer={updateCellOnServer}
              />
            )}

            {cell.type === 'markdown' && (
              <MarkdownCell
                cell={cell}
                onDeleteCell={() => {
                  onDeleteCell(cell);
                }}
                updateCellOnServer={updateCellOnServer}
              />
            )}

            {cell.type === 'generate-ai' && (
              <GenerateAiCell
                cell={cell}
                insertIdx={idx + 2}
                onSuccess={insertGeneratedCells}
                session={session}
              />
            )}
          </div>
        ))}

        {/* There is always an insert cell divider after the last cell */}
        <InsertCellDivider
          className={cn('h-14', cells.length === 0 && 'opacity-100')}
          createCodeCell={() => {
            createNewCell('code', allCells.length);
          }}
          createGenerateAiCodeCell={() => {
            createNewCell('generate-ai', allCells.length);
          }}
          createMarkdownCell={() => {
            createNewCell('markdown', allCells.length);
          }}
          language={session.language}
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
}): JSX.Element {
  return (
    <div
      className={cn(
        'h-5 relative z-10 opacity-0 hover:opacity-100 transition-opacity',
        props.className,
      )}
    >
      <div className="h-full px-3 flex flex-col justify-center">
        <div className="w-full h-[1px] bg-border" />
      </div>

      <div className="absolute top-0 w-full h-full flex items-center justify-center">
        <div className="flex mr-4 border rounded-md bg-background shadow">
          <Button
            className="border-none rounded-md rounded-r-none"
            onClick={props.createCodeCell}
            variant="secondary"
          >
            {props.language === 'javascript' ? 'JavaScript' : 'TypeScript'}
          </Button>
          <Button
            className="border-none rounded-md rounded-l-none"
            onClick={props.createMarkdownCell}
            variant="secondary"
          >
            Markdown
          </Button>
          <Button
            className="border-none rounded-md rounded-l-none"
            onClick={props.createGenerateAiCodeCell}
            variant="secondary"
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
}): JSX.Element {
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
