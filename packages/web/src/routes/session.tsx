import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
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
  TsServerCellSuggestionsPayloadType,
} from '@srcbook/shared';
import { loadSession, loadSessions, getConfig } from '@/lib/server';
import type { SessionType, GenerateAICellType, SettingsType } from '@/types';
import TitleCell from '@/components/cells/title';
import MarkdownCell from '@/components/cells/markdown';
import GenerateAiCell from '@/components/cells/generate-ai';
import CodeCell from '@/components/cells/code';
import SessionMenu, { SESSION_MENU_PANELS, Panel } from '@/components/session-menu';
import { Button } from '@/components/ui/button';
import { SessionChannel } from '@/clients/websocket';
import { CellsProvider, useCells } from '@/components/use-cell';
import { cn } from '@/lib/utils';
import { useHotkeys } from 'react-hotkeys-hook';
import InstallPackageModal from '@/components/install-package-modal';
import { PackageJsonProvider, usePackageJson } from '@/components/use-package-json';
import { SessionNavbar } from '@/components/navbar';
import { toast } from 'sonner';
import { TsConfigProvider } from '@/components/use-tsconfig-json';
// import { TsConfigProvider } from '@/components/use-session-readonly';

async function loader({ params }: LoaderFunctionArgs) {
  const [{ result: config }, { result: srcbooks }, { result: session }] = await Promise.all([
    getConfig(),
    loadSessions(),
    loadSession({ id: params.id! }),
  ]);

  return { config, srcbooks, session };
}

type SessionLoaderDataType = {
  config: SettingsType;
  srcbooks: Array<SessionType>;
  session: SessionType;
};

function SessionPage() {
  const { config, srcbooks, session } = useLoaderData() as SessionLoaderDataType;

  // Because we use refs for our state, we need a way to trigger
  // component re-renders when the ref state changes.
  //
  // https://legacy.reactjs.org/docs/hooks-faq.html#is-there-something-like-forceupdate
  //
  const [, forceComponentRerender] = useReducer((x) => x + 1, 0);

  const channelRef = useRef(SessionChannel.create(session.id));
  const connectedSessionIdRef = useRef<SessionType['id'] | null>(null);
  const connectedSessionLanguageRef = useRef<SessionType['language'] | null>(null);
  const channel = channelRef.current;

  useEffect(() => {
    if (connectedSessionIdRef.current === session.id) {
      return;
    }

    const oldChannel = channelRef.current;

    // Disconnect from the previously connected session
    if (connectedSessionIdRef.current) {
      oldChannel.unsubscribe();

      if (connectedSessionLanguageRef.current === 'typescript') {
        oldChannel.push('tsserver:stop', { sessionId: session.id });
      }
    }

    // Reconnect to the new session
    channelRef.current = SessionChannel.create(session.id);
    connectedSessionIdRef.current = session.id;
    connectedSessionLanguageRef.current = session.language;

    const channel = channelRef.current;

    channel.subscribe();

    if (session.language === 'typescript') {
      channel.push('tsserver:start', { sessionId: session.id });
    }

    forceComponentRerender();
  }, [session.id, session.language, forceComponentRerender]);

  return (
    <CellsProvider cells={session.cells}>
      <PackageJsonProvider session={session} channel={channel}>
        <TsConfigProvider session={session} channel={channel}>
          {/* <Session */}
          {/*   session={session} */}
          {/*   channel={channel} */}
          {/*   srcbooks={srcbooks} */}
          {/*   config={config} */}
          {/* /> */}
          <Session readOnly session={session} srcbooks={srcbooks} config={config} />
        </TsConfigProvider>
      </PackageJsonProvider>
    </CellsProvider>
  );
}

type SessionPropsBase = {
  session: SessionType;
  srcbooks: Array<SessionType>;
  config: SettingsType;
};

type SessionProps =
  | ({ readOnly: true } & SessionPropsBase)
  | ({ readOnly?: false; channel: SessionChannel } & SessionPropsBase);

function Session(props: SessionProps) {
  const { session, srcbooks, config } = props;

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
    outdated: outdatedDependencies,
    installing: installingDependencies,
  } = usePackageJson();

  const [depsInstallModalOpen, setDepsInstallModalOpen] = useState(false);
  const [[selectedPanelName, selectedPanelOpen], setSelectedPanelNameAndOpen] = useState<
    [Panel['name'], boolean]
  >([SESSION_MENU_PANELS[0]!.name, false]);

  const isPanelOpen = useCallback(
    (name: Panel['name']) => selectedPanelOpen && selectedPanelName === name,
    [selectedPanelOpen, selectedPanelName],
  );

  useHotkeys('mod+;', () => {
    if (!isPanelOpen('packages')) {
      setSelectedPanelNameAndOpen(['packages', true]);
    }
  });

  async function onDeleteCell(cell: CellType | GenerateAICellType) {
    if (props.readOnly) {
      return;
    }
    if (cell.type !== 'code' && cell.type !== 'markdown') {
      throw new Error(`Cannot delete cell of type '${cell.type}'`);
    }

    // Optimistically delete cell
    removeCell(cell);

    props.channel.push('cell:delete', {
      sessionId: session.id,
      cellId: cell.id,
    });
  }

  useEffect(() => {
    if (props.readOnly) {
      return;
    }
    const callback = (payload: CellOutputPayloadType) => {
      setOutput(payload.cellId, payload.output);
    };

    props.channel.on('cell:output', callback);

    return () => props.channel.off('cell:output', callback);
  }, [props.readOnly, !props.readOnly ? props.channel : null, setOutput]);

  useEffect(() => {
    if (props.readOnly) {
      return;
    }
    const callback = (payload: TsServerCellDiagnosticsPayloadType) => {
      setTsServerDiagnostics(payload.cellId, payload.diagnostics);
    };

    props.channel.on('tsserver:cell:diagnostics', callback);

    return () => props.channel.off('tsserver:cell:diagnostics', callback);
  }, [props.readOnly, !props.readOnly ? props.channel : null, setTsServerDiagnostics]);

  useEffect(() => {
    if (props.readOnly) {
      return;
    }
    const callback = (payload: TsServerCellSuggestionsPayloadType) => {
      setTsServerSuggestions(payload.cellId, payload.diagnostics);
    };

    props.channel.on('tsserver:cell:suggestions', callback);

    return () => props.channel.off('tsserver:cell:suggestions', callback);
  }, [props.readOnly, !props.readOnly ? props.channel : null, setTsServerSuggestions]);

  useEffect(() => {
    if (props.readOnly) {
      return;
    }
    const callback = (payload: CellUpdatedPayloadType) => {
      updateCell(payload.cell);
    };

    props.channel.on('cell:updated', callback);

    return () => props.channel.off('cell:updated', callback);
  }, [props.readOnly, !props.readOnly ? props.channel : null, updateCell]);

  function updateCellOnServer(cell: CellType, updates: CellUpdateAttrsType) {
    if (props.readOnly) {
      return;
    }
    props.channel.push('cell:update', {
      sessionId: session.id,
      cellId: cell.id,
      updates,
    });
  }

  async function createNewCell(type: 'code' | 'markdown' | 'generate-ai', index: number) {
    if (props.readOnly) {
      return;
    }

    // First, create the cell on client.
    // Then, push state to server, _only_ for code or markdown cells. AI generation is a client side only cell.
    // TODO: Handle potential errors (eg, rollback optimistic client creation if there are errors)
    let cell;
    switch (type) {
      case 'code':
        cell = createCodeCell(index, session.language);
        props.channel.push('cell:create', { sessionId: session.id, index, cell });
        break;
      case 'markdown':
        cell = createMarkdownCell(index);
        props.channel.push('cell:create', { sessionId: session.id, index, cell });
        break;
      case 'generate-ai':
        cell = createGenerateAiCell(index);
        break;
    }
  }

  async function insertGeneratedCells(idx: number, cells: Array<CodeCellType | MarkdownCellType>) {
    if (props.readOnly) {
      return;
    }

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
      props.channel.push('cell:create', { sessionId: session.id, index: insertIdx, cell: newCell });
    }
  }

  // TOOD: We need to stop treating titles and package.json as cells.
  const [titleCellUncasted, _packageJsonCell, ...remainingCells] = allCells;
  const titleCell = titleCellUncasted as TitleCellType;
  const cells = remainingCells as (MarkdownCellType | CodeCellType | GenerateAICellType)[];

  useEffect(() => {
    let result: () => void = () => {};

    if (depsInstallModalOpen || isPanelOpen('packages')) {
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
            setSelectedPanelNameAndOpen(['settings', true]);
            setTimeout(npmInstall, 100);
          },
        },
      });
      result = () => toast.dismiss(toastId);
    } else if (outdatedDependencies) {
      toast.warning('Packages need to be installed', {
        duration: 10000,
        action: {
          label: 'Install',
          onClick: () => {
            // If outdatedDependencies is an array, it usually menas those packages are not present
            // inside of package.json yet. Thus we must specifically install them by name so they are
            // installed and added to package.json. Otherwise, we just need to install what is already
            // listed inside of package.json.
            if (Array.isArray(outdatedDependencies)) {
              npmInstall(outdatedDependencies);
            } else {
              npmInstall();
            }
          },
        },
      });
    }

    return result;
  }, [
    outdatedDependencies,
    installingDependencies,
    dependencyInstallFailed,
    isPanelOpen,
    depsInstallModalOpen,
    npmInstall,
  ]);

  return (
    <div className="flex flex-col">
      <SessionNavbar
        session={session}
        srcbooks={srcbooks}
        baseDir={config.baseDir}
        title={titleCell.text}
      />

      <div className="flex mt-12">
        <PackageInstallModal open={depsInstallModalOpen} onOpenChange={setDepsInstallModalOpen} />
        <SessionMenu
          session={session}
          selectedPanelName={selectedPanelName}
          selectedPanelOpen={selectedPanelOpen}
          onChangeSelectedPanelNameAndOpen={setSelectedPanelNameAndOpen}
          openDepsInstallModal={() => setDepsInstallModalOpen(true)}
          channel={!props.readOnly ? props.channel : null}
        />

        <div className="grow shrink lg:px-0 pb-28">
          <div className="max-w-[800px] mx-auto my-12 px-[32px]">
            {props.readOnly ? (
              <TitleCell readOnly cell={titleCell} />
            ) : (
              <TitleCell cell={titleCell} updateCellOnServer={updateCellOnServer} />
            )}

            {cells.map((cell, idx) => (
              <div key={cell.id}>
                {props.readOnly ? (
                  <div className="h-5" />
                ) : (
                  <InsertCellDivider
                    language={session.language}
                    createCodeCell={() => createNewCell('code', idx + 2)}
                    createMarkdownCell={() => createNewCell('markdown', idx + 2)}
                    createGenerateAiCodeCell={() => createNewCell('generate-ai', idx + 2)}
                  />
                )}

                {cell.type === 'code' && props.readOnly && (
                  <CodeCell readOnly cell={cell} session={session} />
                )}
                {cell.type === 'code' && !props.readOnly && (
                  <CodeCell
                    cell={cell}
                    session={session}
                    channel={props.channel}
                    updateCellOnServer={updateCellOnServer}
                    onDeleteCell={onDeleteCell}
                  />
                )}

                {cell.type === 'markdown' && props.readOnly && (
                  <MarkdownCell
                    readOnly
                    cell={cell}
                  />
                )}
                {cell.type === 'markdown' && !props.readOnly && (
                  <MarkdownCell
                    cell={cell}
                    updateCellOnServer={updateCellOnServer}
                    onDeleteCell={onDeleteCell}
                  />
                )}

                {cell.type === 'generate-ai' && !props.readOnly && (
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
            {!props.readOnly ? (
              <InsertCellDivider
                language={session.language}
                createCodeCell={() => createNewCell('code', allCells.length)}
                createMarkdownCell={() => createNewCell('markdown', allCells.length)}
                createGenerateAiCodeCell={() => createNewCell('generate-ai', allCells.length)}
                className={cn('h-14', cells.length === 0 && 'opacity-100')}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
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
