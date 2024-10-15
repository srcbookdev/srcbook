import { cn } from '@/lib/utils';
import { Button } from '@srcbook/components';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@srcbook/components/src/components/ui/dialog';
import { Undo2Icon, XIcon } from 'lucide-react';
import type { FileDiffType } from './types';
import { DiffSquares, DiffStats } from './diff-stats';
import { DiffEditor } from './editor';

type PropsType = {
  onUndoAll: () => void;
  onClose: () => void;
  files: FileDiffType[];
};

export default function DiffModal({ files, onClose, onUndoAll }: PropsType) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (open === false) {
          onClose();
        }
      }}
    >
      <DialogContent
        className={cn('w-[95vw] h-[95vh] max-w-none p-0 gap-0 flex flex-col')}
        hideClose
      >
        {/* Got browser console warnings without this */}
        <DialogDescription className="sr-only">View diff of files changed</DialogDescription>
        <DiffModalHeader onClose={onClose} onUndoAll={onUndoAll} />
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {files.map((file) => (
            <FileDiff key={file.path} file={file} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DiffModalHeader({ onClose, onUndoAll }: { onClose: () => void; onUndoAll: () => void }) {
  return (
    <div className="h-12 px-4 flex items-center justify-between border-b border-border">
      <div>
        <DialogTitle className="font-semibold">Files changed</DialogTitle>
      </div>
      <div className="flex items-center space-x-3">
        <Button variant="secondary" className="flex items-center space-x-1.5" onClick={onUndoAll}>
          <Undo2Icon size={16} />
          <span>Undo all</span>
        </Button>
        <Button variant="icon" className="h-8 w-8 p-1.5 border-none" onClick={onClose}>
          <XIcon size={16} />
          <span className="sr-only">Close</span>
        </Button>
      </div>
    </div>
  );
}

function FileDiff({ file }: { file: FileDiffType }) {
  return (
    <div className="border rounded-md">
      <div className="h-10 px-3 flex items-center border-b border-border">
        <div className="font-mono text-sm flex items-center gap-3">
          <h4 className="text-secondary-foreground">{file.path}</h4>
          <DiffStats additions={file.additions} deletions={file.deletions} />
          <DiffSquares additions={file.additions} deletions={file.deletions} />
        </div>
      </div>
      <div className="flex flex-col">
        <DiffEditor path={file.path} modified={file.modified} original={file.original} />
      </div>
    </div>
  );
}
