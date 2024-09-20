import { useState } from 'react';
import { useSettings } from '@/components/use-settings';
import { Ban, Maximize, Minimize, PanelBottomClose, PanelBottomOpen, Sparkles } from 'lucide-react';
import { CodeCellType, PackageJsonCellType, TsServerDiagnosticType } from '@srcbook/shared';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/underline-flat-tabs';
import { useCells } from '@/components/use-cell';
import { OutputType, StdoutOutputType, StderrOutputType, CellModeType } from '@/types';
import { Button } from './ui/button';

type BaseProps = {
  cell: CodeCellType | PackageJsonCellType;
  show: boolean;
  setShow: (show: boolean) => void;
};

type RegularProps = BaseProps & {
  readOnly?: false;
  fixDiagnostics: (diagnostics: string) => void;
  cellMode: CellModeType;
  setFullscreen: (fullscreen: boolean) => void;
  fullscreen: boolean;
};
type ReadOnlyProps = BaseProps & { readOnly: true };

type Props = RegularProps | ReadOnlyProps;

export function CellOutput(props: Props) {
  const { cell, show, setShow } = props;
  const { getOutput, clearOutput, getTsServerDiagnostics, getTsServerSuggestions } = useCells();

  const [activeTab, setActiveTab] = useState<'stdout' | 'stderr' | 'problems' | 'warnings'>(
    'stdout',
  );

  const fullscreen = !props.readOnly ? props.fullscreen : false;
  const stdout = getOutput(cell.id, 'stdout') as StdoutOutputType[];
  const stderr = getOutput(cell.id, 'stderr') as StderrOutputType[];
  const diagnostics = !props.readOnly ? getTsServerDiagnostics(cell.id) : [];
  const suggestions = !props.readOnly ? getTsServerSuggestions(cell.id) : [];

  return (
    <div className={cn('font-mono text-sm', fullscreen && !show && 'border-b')}>
      <Tabs
        value={activeTab}
        onValueChange={(value) =>
          setActiveTab(value as 'stdout' | 'stderr' | 'problems' | 'warnings')
        }
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
            {cell.type === 'code' && cell.language === 'typescript' && !props.readOnly && (
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
            {cell.type === 'code' && cell.language === 'typescript' && !props.readOnly && (
              <TabsTrigger
                onClick={() => setShow(true)}
                value="warnings"
                className={cn(
                  !show &&
                    'border-transparent data-[state=active]:border-transparent data-[state=active]:text-tertiary-foreground mb-0',
                )}
              >
                {suggestions.length > 0 ? (
                  <>
                    warnings <span className="text-sb-yellow-50">({suggestions.length})</span>
                  </>
                ) : (
                  'warnings'
                )}
              </TabsTrigger>
            )}
          </TabsList>
          <div className="flex items-center gap-6">
            {!props.readOnly ? (
              <button
                className="hover:text-secondary-hover disabled:pointer-events-none disabled:opacity-50"
                onClick={() => {
                  if (props.readOnly) {
                    return;
                  }
                  props.setFullscreen(!fullscreen);
                }}
              >
                {fullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
              </button>
            ) : null}
            {!props.readOnly ? (
              <button
                className="hover:text-secondary-hover disabled:pointer-events-none disabled:opacity-50"
                disabled={activeTab === 'problems' || activeTab === 'warnings'}
                onClick={() =>
                  clearOutput(
                    cell.id,
                    activeTab === 'problems' || activeTab === 'warnings' ? undefined : activeTab,
                  )
                }
              >
                <Ban size={16} />
              </button>
            ) : null}
            <button className="hover:text-secondary-hover" onClick={() => setShow(!show)}>
              {show ? <PanelBottomOpen size={20} /> : <PanelBottomClose size={20} />}
            </button>
          </div>
        </div>
        {show && (
          <div
            className={cn(
              'p-2 flex flex-col-reverse overflow-auto whitespace-pre-wrap text-[13px]',
              !fullscreen && 'max-h-96',
            )}
          >
            <TabsContent className="mt-0" value="stdout">
              <Stdout stdout={stdout} />
            </TabsContent>
            <TabsContent value="stderr" className="mt-0">
              <Stderr stderr={stderr} />
            </TabsContent>
            {cell.type === 'code' && cell.language === 'typescript' && !props.readOnly && (
              <TabsContent value="problems" className="mt-0">
                <TsServerDiagnostics
                  diagnostics={diagnostics}
                  fixDiagnostics={props.fixDiagnostics}
                  cellMode={props.cellMode}
                />
              </TabsContent>
            )}
            {cell.type === 'code' && cell.language === 'typescript' && !props.readOnly && (
              <TabsContent value="warnings" className="mt-0">
                <TsServerSuggestions
                  suggestions={suggestions}
                  fixSuggestions={props.fixDiagnostics} // fixDiagnostics works for both diagnostics and suggestions
                  cellMode={props.cellMode}
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
  cellMode: CellModeType;
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
          className="self-start flex items-center gap-2 px-2.5 py-2 font-sans h-7 mt-3"
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

function TsServerSuggestions({
  suggestions,
  fixSuggestions,
  cellMode,
}: {
  suggestions: TsServerDiagnosticType[];
  fixSuggestions: (suggestions: string) => void;
  cellMode: CellModeType;
}) {
  const { aiEnabled } = useSettings();
  const formattedSuggestions = suggestions.map(formatDiagnostic).join('\n');
  return suggestions.length === 0 ? (
    <div className="italic text-center text-muted-foreground">No warnings or suggestions</div>
  ) : (
    <div className="flex flex-col w-full">
      <p>{formattedSuggestions}</p>
      {aiEnabled && cellMode !== 'fixing' && (
        <Button
          variant="ai"
          className="self-start flex items-center gap-2 px-2.5 py-2 font-sans h-7 mt-3"
          onClick={() => fixSuggestions(formattedSuggestions)}
          disabled={cellMode === 'generating'}
        >
          <Sparkles size={16} />
          <p>Fix with AI</p>
        </Button>
      )}
    </div>
  );
}
