import { useState } from 'react';
import { Ban, X } from 'lucide-react';
import { CodeCellType, PackageJsonCellType } from '@srcbook/shared';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/underline-flat-tabs';
import { useCells } from '@/components/use-cell';
import { OutputType, StdoutOutputType, StderrOutputType, TscOutputType } from '@/types';

type PropsType = {
  cell: CodeCellType | PackageJsonCellType;
  show: boolean;
  setShow: (show: boolean) => void;
};

export function CellStdio({ cell, show, setShow }: PropsType) {
  const { getOutput, clearOutput } = useCells();

  const [activeTab, setActiveTab] = useState('stdout');

  const stdout = getOutput(cell.id, 'stdout') as StdoutOutputType[];
  const stderr = getOutput(cell.id, 'stderr') as StderrOutputType[];
  const tscOutput = getOutput(cell.id, 'tsc') as TscOutputType[];

  if (!show) {
    return null;
  }

  function dismiss() {
    clearOutput(cell.id);
    setShow(false);
  }

  return (
    <div className="border-t font-mono text-sm">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="px-3 flex items-center justify-between bg-muted text-tertiary-foreground border-b">
          <TabsList className="h-full">
            <TabsTrigger value="stdout">stdout</TabsTrigger>
            <TabsTrigger value="stderr">
              {stderr.length > 0 ? (
                <>
                  stderr <span className="text-sb-red-30">({stderr.length})</span>
                </>
              ) : (
                'stderr'
              )}
            </TabsTrigger>
            {cell.type === 'code' && cell.language === 'typescript' && (
              <TabsTrigger value="problems">
                {tscOutput.length > 0 ? (
                  <>
                    problems <span className="text-sb-red-30">({tscOutput.length})</span>
                  </>
                ) : (
                  'problems'
                )}
              </TabsTrigger>
            )}
          </TabsList>
          <div className="flex items-center gap-6">
            <button className=" hover:text-secondary-hover" onClick={() => clearOutput(cell.id)}>
              <Ban size={16} />
            </button>
            <button className=" hover:text-secondary-hover" onClick={dismiss}>
              <X size={20} />
            </button>
          </div>
        </div>
        <TabsContent value="stdout" className="mt-0">
          <Stdout stdout={stdout} />
        </TabsContent>
        <TabsContent value="stderr" className="mt-0">
          <Stderr stderr={stderr} />
        </TabsContent>
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
        <div className="italic text-center text-muted-foreground text-sm">No output</div>
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
        stderr.length > 0 && 'text-sb-red-30',
      )}
    >
      {stderr.length === 0 ? (
        <div className="italic text-center text-muted-foreground text-sm">
          No errors or warnings
        </div>
      ) : (
        formatOutput(stderr)
      )}
    </div>
  );
}

function TscOutput({ tsc }: { tsc: TscOutputType[] }) {
  return (
    <div className="p-2 flex flex-col-reverse max-h-96 overflow-scroll whitespace-pre-wrap">
      {tsc.length === 0 ? (
        <div className="italic text-center text-muted-foreground">No output</div>
      ) : (
        formatOutput(tsc)
      )}
    </div>
  );
}
