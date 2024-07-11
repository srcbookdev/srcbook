import { useEffect, useRef } from 'react';
import { useLoaderData, type LoaderFunctionArgs } from 'react-router-dom';
import {
  CellType,
  CellOutputPayloadType,
  CellUpdatedPayloadType,
  CellUpdateAttrsType,
  TsServerCellDiagnosticsPayloadType,
} from '@srcbook/shared';
import { loadSession, createCell } from '@/lib/server';
import { SessionType } from '@/types';
import TitleCell from '@/components/cells/title';
import MarkdownCell from '@/components/cells/markdown';
import PackageJsonCell from '@/components/cells/package-json';
import CodeCell from '@/components/cells/code';
import SessionMenu from '@/components/session-menu';
import { Button } from '@/components/ui/button';
import { SessionChannel } from '@/clients/websocket';
import { CellsProvider, useCells } from '@/components/use-cell';
import useEffectOnce from '@/components/use-effect-once';

async function loader({ params }: LoaderFunctionArgs) {
  const { result: session } = await loadSession({ id: params.id! });
  return { session };
}

function SessionPage() {
  const { session } = useLoaderData() as { session: SessionType };

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
      <Session session={session} channel={channelRef.current} />
    </CellsProvider>
  );
}

function Session(props: { session: SessionType; channel: SessionChannel }) {
  const { session, channel } = props;

  const {
    cells,
    setCells,
    updateCell,
    removeCell,
    createCodeCell,
    createMarkdownCell,
    setOutput,
    setTsServerDiagnostics,
  } = useCells();

  async function onDeleteCell(cell: CellType) {
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

  async function onUpdateCell<T extends CellType>(
    cell: T,
    updates: CellUpdateAttrsType,
    getValidationError?: (cell: T) => string | null,
  ) {
    getValidationError = getValidationError || (() => null);
    updateCell({ ...cell, ...(updates as Partial<T>) });

    const error = getValidationError({ ...cell, ...(updates as Partial<T>) });
    if (typeof error === 'string') {
      return error;
    }

    channel.push('cell:update', {
      sessionId: session.id,
      cellId: cell.id,
      updates,
    });
    return null;
  }

  async function createNewCell(type: 'code' | 'markdown', index: number) {
    // Create on client
    const cell =
      type === 'code'
        ? createCodeCell(index, session.metadata.language)
        : createMarkdownCell(index);

    const response = await createCell({ sessionId: session.id, cell, index });

    if (response.error) {
      // Undo client cell creation
      setCells(cells);
      console.error('Failed to update cell', response);
    }
  }

  return (
    <>
      <SessionMenu session={session} />

      {/* At the xl breakpoint, the sessionMenu appears inline so we pad left to balance*/}
      <div className="px-[72px] xl:pl-[100px]">
        {cells.map((cell, idx) => (
          <div key={`wrapper-${cell.id}`}>
            {idx > 1 && (
              <div className="relative h-5 flex items-center opacity-0 hover:opacity-100 transition-opacity">
                <div className="w-[calc(100%-4px)] h-[1px] mx-auto bg-border"></div>
                <div className="absolute h-10 mt-0.5 -translate-x-full">
                  <div className="flex mr-4 border rounded-sm bg-background">
                    <Button
                      variant="secondary"
                      className="border-none rounded-r-none"
                      onClick={() => createNewCell('code', idx)}
                    >
                      {session.metadata.language === 'javascript' ? 'JS' : 'TS'}
                    </Button>
                    <Button
                      variant="secondary"
                      className="border-none rounded-l-none"
                      onClick={() => createNewCell('markdown', idx)}
                    >
                      MD
                    </Button>
                  </div>
                </div>
              </div>
            )}
            <Cell
              key={cell.id}
              cell={cell}
              session={session}
              channel={channel}
              onUpdateCell={onUpdateCell}
              onDeleteCell={onDeleteCell}
            />
          </div>
        ))}

        {/** -- Add some padding at the bottom to make it more breathable + activate the new cell more easily */}
        <div className="pt-2 min-h-64 opacity-0 hover:opacity-100 transition-opacity">
          <div className="flex items-center px-0.5 gap-2">
            <div className="flex-grow h-[1px] bg-border"></div>
            <div className="flex border rounded-sm bg-background">
              <Button
                variant="secondary"
                className="border-none rounded-r-none"
                onClick={() => createNewCell('code', cells.length)}
              >
                {session.metadata.language === 'javascript' ? 'JavaScript' : 'TypeScript'}
              </Button>
              <Button
                variant="secondary"
                className="border-none rounded-l-none"
                onClick={() => createNewCell('markdown', cells.length)}
              >
                Markdown
              </Button>
            </div>
            <div className="flex-grow h-[1px] bg-border"></div>
          </div>
        </div>
      </div>
    </>
  );
}

function Cell(props: {
  cell: CellType;
  session: SessionType;
  channel: SessionChannel;
  onUpdateCell: <T extends CellType>(
    cell: T,
    attrs: CellUpdateAttrsType,
    getValidationError?: (cell: T) => string | null,
  ) => Promise<string | null>;
  onDeleteCell: (cell: CellType) => void;
}) {
  switch (props.cell.type) {
    case 'title':
      return <TitleCell cell={props.cell} onUpdateCell={props.onUpdateCell} />;
    case 'code':
      return (
        <CodeCell
          session={props.session}
          cell={props.cell}
          channel={props.channel}
          onUpdateCell={props.onUpdateCell}
          onDeleteCell={props.onDeleteCell}
        />
      );
    case 'markdown':
      return (
        <MarkdownCell
          cell={props.cell}
          onUpdateCell={props.onUpdateCell}
          onDeleteCell={props.onDeleteCell}
        />
      );
    case 'package.json':
      return (
        <PackageJsonCell
          session={props.session}
          channel={props.channel}
          cell={props.cell}
          onUpdateCell={props.onUpdateCell}
        />
      );
    default:
      throw new Error('Unrecognized cell type');
  }
}

SessionPage.loader = loader;
export default SessionPage;
