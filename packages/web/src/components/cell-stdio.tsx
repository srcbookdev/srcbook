import { useEffect, useState } from 'react';
import { CodeCellType, PackageJsonCellType } from '@srcbook/shared';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useCells } from '@/components/use-cell';
import { OutputType, StdoutOutputType, StderrOutputType, TscOutputType } from '@/types';
import { SessionChannel } from '@/clients/websocket';

export function CellStdio({
  sessionId,
  cell,
  channel,
}: {
  sessionId: string;
  cell: CodeCellType | PackageJsonCellType;
  channel: SessionChannel;
}) {
  const { hasOutput, getOutput, clearOutput } = useCells();

  const [activeTab, setActiveTab] = useState('stdout');
  const [showStdin, setShowStdin] = useState(false);

  useEffect(() => {
    if (activeTab === 'stdin' && cell.status !== 'running') {
      setActiveTab('stdout');
    }
  }, [activeTab, cell.status]);

  useEffect(() => {
    if (cell.status === 'running') {
      setTimeout(() => setShowStdin(true), 2000);
    }
    setShowStdin(false);
  }, [cell.status]);

  const stdout = getOutput(cell.id, 'stdout') as StdoutOutputType[];
  const stderr = getOutput(cell.id, 'stderr') as StderrOutputType[];
  const tscOutput = getOutput(cell.id, 'tsc') as TscOutputType[];

  // Make sure to also check cell.status here because the user may want
  // to access stdin when a cell is running regardless of stdout/stderr
  if (!hasOutput(cell.id) && cell.status !== 'running') {
    return null;
  }

  function sendStdin(stdin: string) {
    channel.push('cell:stdin', { sessionId: sessionId, cellId: cell.id, stdin });
  }

  return (
    <div className="border rounded mt-2 font-mono text-sm bg-input/10">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="p-0.5 flex items-center justify-between bg-muted text-muted-foreground rounded-t">
          <TabsList className="w-full justify-start rounded-none">
            <TabsTrigger value="stdout">stdout</TabsTrigger>
            <TabsTrigger value="stderr">
              {stderr.length > 0 ? (
                <>
                  stderr <span className="text-orange-800">({stderr.length})</span>
                </>
              ) : (
                'stderr'
              )}
            </TabsTrigger>
            {cell.type === 'code' && cell.language === 'typescript' && (
              <TabsTrigger value="problems">
                {tscOutput.length > 0 ? (
                  <>
                    problems <span className="text-orange-800">({tscOutput.length})</span>
                  </>
                ) : (
                  'problems'
                )}
              </TabsTrigger>
            )}
            {cell.type === 'code' && cell.status === 'running' && showStdin && (
              <TabsTrigger value="stdin">stdin</TabsTrigger>
            )}
          </TabsList>
          {hasOutput(cell.id) && (
            <button
              className="px-3 py-1 ring-offset-background hover:font-medium hover:underline underline-offset-2"
              onClick={() => clearOutput(cell.id)}
            >
              clear
            </button>
          )}
        </div>
        <TabsContent value="stdout" className="mt-0">
          <Stdout stdout={stdout} />
        </TabsContent>
        <TabsContent value="stderr" className="mt-0">
          <Stderr stderr={stderr} />
        </TabsContent>
        {cell.status === 'running' && (
          <TabsContent value="stdin" className="mt-0">
            <Stdin onSubmit={sendStdin} />
          </TabsContent>
        )}
        {cell.type === 'code' && cell.language === 'typescript' && (
          <TabsContent value="problems" className="mt-0">
            <TscOutput tsc={tscOutput} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function formatOutput(output: OutputType[]) {
  return output.map(({ data }) => data).join('');
}

function Stdout({ stdout }: { stdout: StdoutOutputType[] }) {
  return (
    <div className="p-2 flex flex-col-reverse max-h-96 overflow-scroll whitespace-pre-wrap">
      {stdout.length === 0 ? (
        <div className="italic text-center">No output</div>
      ) : (
        formatOutput(stdout)
      )}
    </div>
  );
}

function Stderr({ stderr }: { stderr: StderrOutputType[] }) {
  return (
    <div
      className={cn(
        'p-2 flex flex-col-reverse max-h-96 overflow-scroll whitespace-pre-wrap',
        stderr.length > 0 && 'text-orange-800',
      )}
    >
      {stderr.length === 0 ? (
        <div className="italic text-center">No errors or warnings</div>
      ) : (
        formatOutput(stderr)
      )}
    </div>
  );
}

function TscOutput({ tsc }: { tsc: TscOutputType[] }) {
  return (
    <div className="p-2 flex flex-col-reverse max-h-96 overflow-scroll whitespace-pre-wrap">
      {tsc.length === 0 ? <div className="italic text-center">No output</div> : formatOutput(tsc)}
    </div>
  );
}

export function Stdin({ onSubmit }: { onSubmit: (stdin: string) => void }) {
  const [stdin, setStdin] = useState('');

  function submit() {
    // Always append newline to signal completion of stdin
    onSubmit(stdin + '\n');
    setStdin('');
  }

  return (
    <div>
      <textarea
        rows={3}
        className="p-2 block bg-white w-full border-0 outline-none ring-none resize-none" // 'block' is needed for margin bottom issue
        placeholder="write to stdin..."
        onKeyDown={(e) => {
          if (e.metaKey && e.key === 'Enter') {
            submit();
          }
        }}
        value={stdin}
        onChange={(e) => setStdin(e.currentTarget.value)}
      ></textarea>
      <div className="border-t bg-input/10 flex items-center justify-end">
        <button
          className="px-3 py-1 ring-offset-background hover:font-medium hover:underline underline-offset-2"
          onClick={submit}
        >
          send
        </button>
      </div>
    </div>
  );
}
