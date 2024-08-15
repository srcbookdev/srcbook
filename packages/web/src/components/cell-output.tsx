import { useState } from 'react';
import { useSettings } from '@/components/use-settings';
import { Ban, PanelBottomClose, Loader2, PanelBottomOpen, Sparkles } from 'lucide-react';
import { CodeCellType, PackageJsonCellType, TsServerDiagnosticType } from '@srcbook/shared';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/underline-flat-tabs';
import { useCells } from '@/components/use-cell';
import { OutputType, StdoutOutputType, StderrOutputType } from '@/types';
import { Button } from './ui/button';

type PropsType = {
  cell: CodeCellType | PackageJsonCellType;
  show: boolean;
  setShow: (show: boolean) => void;
  fixDiagnostics: (diagnostics: string) => void;
  cellMode: 'off' | 'generating' | 'reviewing' | 'prompting' | 'fixing';
  fullscreen?: boolean;
};

export function CellOutput({
  cell,
  show,
  setShow,
  fixDiagnostics,
  cellMode,
  fullscreen,
}: PropsType) {
  const { getOutput, clearOutput, getTsServerDiagnostics } = useCells();

  const [activeTab, setActiveTab] = useState<'stdout' | 'stderr' | 'problems'>('stdout');

  const stdout = getOutput(cell.id, 'stdout') as StdoutOutputType[];
  const stderr = getOutput(cell.id, 'stderr') as StderrOutputType[];
  const diagnostics = getTsServerDiagnostics(cell.id);

  return (
    <div className={cn('font-mono text-sm', fullscreen && !show && 'border-b')}>
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'stdout' | 'stderr' | 'problems')}
        defaultValue="stdout"
      >
        <div
          className={cn(
            'border-t px-3 flex items-center justify-between bg-muted text-tertiary-foreground rounded-b-md',
            show && 'border-b rounded-none',
            fullscreen && 'sticky top-0 border-t',
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
                <TsServerDiagnostics
                  diagnostics={diagnostics}
                  fixDiagnostics={fixDiagnostics}
                  cellMode={cellMode}
                />
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

function TsServerDiagnostics({
  diagnostics,
  fixDiagnostics,
  cellMode,
}: {
  diagnostics: TsServerDiagnosticType[];
  fixDiagnostics: (diagnostics: string) => void;
  cellMode: 'off' | 'generating' | 'reviewing' | 'prompting' | 'fixing';
}) {
  const { aiEnabled } = useSettings();
  const formattedDiagnostics = diagnostics.map(formatDiagnostic).join('\n');
  return diagnostics.length === 0 ? (
    <div className="italic text-center text-muted-foreground">No problems</div>
  ) : (
    <div className="flex flex-col w-full">
      <p>{formattedDiagnostics}</p>
      {aiEnabled && cellMode !== 'fixing' && (
        <Button
          variant="ai"
          className="self-start flex items-center gap-2 px-2.5 py-2 font-sans h-7 mt-2"
          onClick={() => fixDiagnostics(formattedDiagnostics)}
          disabled={cellMode === 'generating'}
        >
          <Sparkles size={16} />
          <p>Fix with AI</p>
        </Button>
      )}
    </div>
  );
}
