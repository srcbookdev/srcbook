import { useState } from 'react';
import { Ban, PanelBottomClose, PanelBottomOpen } from 'lucide-react';
import { CodeCellType, PackageJsonCellType, TsServerDiagnosticType } from '@srcbook/shared';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/underline-flat-tabs';
import { useCells } from '@/components/use-cell';
import { OutputType, StdoutOutputType, StderrOutputType } from '@/types';

type PropsType = {
  cell: CodeCellType | PackageJsonCellType;
  show: boolean;
  setShow: (show: boolean) => void;
  fullscreen?: boolean;
};

export function CellOutput({ cell, show, setShow, fullscreen }: PropsType) {
  const { getOutput, clearOutput, getTsServerDiagnostics } = useCells();

  const [activeTab, setActiveTab] = useState<'stdout' | 'stderr' | 'problems'>('stdout');

  const stdout = getOutput(cell.id, 'stdout') as StdoutOutputType[];
  const stderr = getOutput(cell.id, 'stderr') as StderrOutputType[];
  const diagnostics = getTsServerDiagnostics(cell.id);

  return (
    <div className="font-mono text-sm relative">
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'stdout' | 'stderr' | 'problems')}
      >
        <div
          className={cn(
            'border-t px-3 flex items-center justify-between bg-muted text-tertiary-foreground rounded-md',
            show && 'border-b rounded-none',
            fullscreen && 'sticky top-0',
          )}
        >
          <TabsList className={cn('h-full', !show && '')}>
            <TabsTrigger
              onClick={() => setShow(true)}
              value="stdout"
              className={cn(
                !show &&
                  'border-transparent data-[state=active]:border-transparent data-[state=active]:text-tertiary-foreground mb-0',
              )}
            >
              stdout
            </TabsTrigger>
            <TabsTrigger
              onClick={() => setShow(true)}
              value="stderr"
              className={cn(
                !show &&
                  'border-transparent data-[state=active]:border-transparent data-[state=active]:text-tertiary-foreground mb-0',
              )}
            >
              {stderr.length > 0 ? (
                <>
                  stderr <span className="text-sb-red-30">({stderr.length})</span>
                </>
              ) : (
                'stderr'
              )}
            </TabsTrigger>
            {cell.type === 'code' && cell.language === 'typescript' && (
              <TabsTrigger
                onClick={() => setShow(true)}
                value="problems"
                className={cn(
                  !show &&
                    'border-transparent data-[state=active]:border-transparent data-[state=active]:text-tertiary-foreground mb-0',
                )}
              >
                {diagnostics.length > 0 ? (
                  <>
                    problems <span className="text-sb-red-30">({diagnostics.length})</span>
                  </>
                ) : (
                  'problems'
                )}
              </TabsTrigger>
            )}
          </TabsList>
          <div className="flex items-center gap-6">
            <button
              className="hover:text-secondary-hover disabled:pointer-events-none disabled:opacity-50"
              disabled={activeTab === 'problems'}
              onClick={() => clearOutput(cell.id, activeTab === 'problems' ? undefined : activeTab)}
            >
              <Ban size={16} />
            </button>
            <button className="hover:text-secondary-hover" onClick={() => setShow(!show)}>
              {show ? <PanelBottomOpen size={20} /> : <PanelBottomClose size={20} />}
            </button>
          </div>
        </div>
        {show && (
          <div
            className={cn(
              'p-2 flex flex-col-reverse overflow-scroll whitespace-pre-wrap text-[13px]',
              !fullscreen && 'max-h-96',
            )}
          >
            <TabsContent className="mt-0" value="stdout">
              <Stdout stdout={stdout} />
            </TabsContent>
            <TabsContent value="stderr" className="mt-0">
              <Stderr stderr={stderr} />
            </TabsContent>
            {cell.type === 'code' && cell.language === 'typescript' && (
              <TabsContent value="problems" className="mt-0">
                <TsServerDiagnostics diagnostics={diagnostics} />
              </TabsContent>
            )}
          </div>
        )}
      </Tabs>
    </div>
  );
}

function formatOutput(output: OutputType[], sep = '') {
  return output.map(({ data }) => data).join(sep);
}

function Stdout({ stdout }: { stdout: StdoutOutputType[] }) {
  return stdout.length === 0 ? (
    <div className="italic text-center text-muted-foreground">No output</div>
  ) : (
    formatOutput(stdout)
  );
}

function Stderr({ stderr }: { stderr: StderrOutputType[] }) {
  return (
    <div className={stderr.length > 0 ? 'text-sb-red-30' : ''}>
      {stderr.length === 0 ? (
        <div className="italic text-center text-muted-foreground">No errors or warnings</div>
      ) : (
        formatOutput(stderr)
      )}
    </div>
  );
}

function formatDiagnostic(diag: TsServerDiagnosticType) {
  return `[Ln ${diag.start.line}, Col ${diag.start.offset}] ${diag.category} ts(${diag.code}): ${diag.text}`;
}

function TsServerDiagnostics({ diagnostics }: { diagnostics: TsServerDiagnosticType[] }) {
  return diagnostics.length === 0 ? (
    <div className="italic text-center text-muted-foreground">No problems</div>
  ) : (
    diagnostics.map(formatDiagnostic).join('\n')
  );
}
