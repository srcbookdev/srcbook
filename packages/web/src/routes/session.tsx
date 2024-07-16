import { useEffect, useRef } from 'react';
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
  PackageJsonCellType,
} from '@srcbook/shared';
import { loadSession } from '@/lib/server';
import { SessionType, type GenerateAICodeCellType } from '@/types';
import TitleCell from '@/components/cells/title';
import MarkdownCell from '@/components/cells/markdown';
import GenerateAiCell from '@/components/cells/generate-ai';
import PackageJsonCell from '@/components/cells/package-json';
import CodeCell from '@/components/cells/code';
import SessionMenu from '@/components/session-menu';
import { Button } from '@/components/ui/button';
import { SessionChannel } from '@/clients/websocket';
import { CellsProvider, useCells } from '@/components/use-cell';
import useEffectOnce from '@/components/use-effect-once';
import { cn } from '@/lib/utils';

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
    cells: allCells,
    updateCell,
    removeCell,
    createCodeCell,
    createMarkdownCell,
    createGenerateAiCodeCell,
    setOutput,
    setTsServerDiagnostics,
  } = useCells();

  async function onDeleteCell(cell: CellType | GenerateAICodeCellType) {
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
    updateCell({ ...cell, ...updates });

    const error = getValidationError({ ...cell, ...updates });
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

  async function createNewCell(type: 'code' | 'markdown' | 'code-generate-ai', index: number) {
    // Create on client first.
    // Then, push to server for code cells or markdown cells, but _not_ AI generation which is client side only
    // TODO: question this ^
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
      case 'code-generate-ai':
        cell = createGenerateAiCodeCell(index, session.metadata.language);
        break;
    }
  }

  async function insertGeneratedCell(idx: number, cell: CodeCellType | MarkdownCellType) {
    let newCell;
    switch (cell.type) {
      case 'code':
        newCell = createCodeCell(idx, session.metadata.language, cell);
        break;
      case 'markdown':
        newCell = createMarkdownCell(idx, cell);
        break;
    }
    channel.push('cell:create', { sessionId: session.id, index: idx, cell: newCell });
  }

  // TOOD: We need to stop treating titles and package.json as cells.
  const [titleCell, packageJsonCell, ...remainingCells] = allCells;
  const cells = remainingCells as (MarkdownCellType | CodeCellType | GenerateAICodeCellType)[];

  return (
    <>
      <SessionMenu session={session} />

      {/* At the xl breakpoint, the sessionMenu appears inline so we pad left to balance*/}
      <div className="px-[72px] xl:pl-[100px] pb-28">
        <TitleCell cell={titleCell as TitleCellType} onUpdateCell={onUpdateCell} />

        <PackageJsonCell
          session={session}
          channel={channel}
          cell={packageJsonCell as PackageJsonCellType}
          onUpdateCell={onUpdateCell}
        />

        {cells.map((cell, idx) => (
          <div key={cell.id}>
            <InsertCellDivider
              language={session.metadata.language}
              createCodeCell={() => createNewCell('code', idx + 2)}
              createMarkdownCell={() => createNewCell('markdown', idx + 2)}
              createGenerateAiCodeCell={() => createNewCell('code-generate-ai', idx + 2)}
            />

            {cell.type === 'code' && (
              <CodeCell
                cell={cell}
                session={session}
                channel={channel}
                onUpdateCell={onUpdateCell}
                onDeleteCell={onDeleteCell}
              />
            )}

            {cell.type === 'markdown' && (
              <MarkdownCell cell={cell} onUpdateCell={onUpdateCell} onDeleteCell={onDeleteCell} />
            )}

            {cell.type === 'generate-ai-code' && (
              <GenerateAiCell
                cell={cell}
                session={session}
                insertIdx={idx + 2}
                onSuccess={insertGeneratedCell}
              />
            )}
          </div>
        ))}

        {/* There is always an insert cell divider after the last cell */}
        <InsertCellDivider
          language={session.metadata.language}
          createCodeCell={() => createNewCell('code', allCells.length)}
          createMarkdownCell={() => createNewCell('markdown', allCells.length)}
          createGenerateAiCodeCell={() => createNewCell('code-generate-ai', allCells.length)}
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
            Create with AI
          </Button>
        </div>
      </div>
    </div>
  );
}

SessionPage.loader = loader;
export default SessionPage;
