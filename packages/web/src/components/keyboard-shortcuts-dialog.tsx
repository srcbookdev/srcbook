import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function ShortCut({ keys, description }: { keys: string[]; description: string }) {
  return (
    <div className="grid grid-cols-4 w-full py-2">
      <p className="col-span-1">
        {keys.map((key, i) => {
          return (
            <React.Fragment key={key}>
              <span className="font-mono bg-primary text-primary-foreground py-[1px] px-1.5 rounded shadow-md">
                {key}
              </span>
              {i < keys.length - 1 && <span className="mx-1.5">+</span>}
            </React.Fragment>
          );
        })}
      </p>
      <p className="col-span-3">{description}</p>
    </div>
  );
}

export default function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription asChild>
            <div>
              <h5 className="font-semibold pt-4 pb-2">Global</h5>
              <ShortCut keys={['?']} description="show this dialog" />
              <h5 className="font-semibold pt-6 pb-2">Markdown edit</h5>
              <ShortCut keys={['esc']} description="switch back to preview mode" />
              <ShortCut keys={['⌘', '↵']} description="switch back to preview mode" />
              <h5 className="font-semibold pt-6 pb-2">Code cell edit</h5>
              <ShortCut keys={['⌘', '↵']} description="run cell" />
              <ShortCut keys={['⌘', '/']} description="toggle lines comment" />
              <ShortCut keys={['⌥', '↑']} description="move lines up" />
              <ShortCut keys={['⌥', '↓']} description="move lines down" />
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
