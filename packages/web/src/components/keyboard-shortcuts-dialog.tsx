import Shortcut from '@/components/keyboard-shortcut';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function ShortcutRow({ keys, description }: { keys: string[]; description: string }) {
  return (
    <div className="grid grid-cols-4 w-full py-2">
      <p className="col-span-1">
        <Shortcut keys={keys} />
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
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription asChild>
            <div>
              <h5 className="font-semibold pt-4 pb-2">Global</h5>
              <ShortcutRow description="show this dialog" keys={['?']} />
              <ShortcutRow description="open Srcbook settings" keys={['mod', ';']} />
              <ShortcutRow description="open NPM package install modal" keys={['mod', 'i']} />
              <h5 className="font-semibold pt-6 pb-2">Markdown edit</h5>
              <ShortcutRow description="switch back to preview mode" keys={['esc']} />
              <ShortcutRow description="switch back to preview mode" keys={['mod', '↵']} />
              <h5 className="font-semibold pt-6 pb-2">Code cell edit</h5>
              <ShortcutRow description="run cell" keys={['mod', '↵']} />
              <ShortcutRow description="toggle lines comment" keys={['mod', '/']} />
              <ShortcutRow description="move lines up" keys={['alt', '↑']} />
              <ShortcutRow description="move lines down" keys={['alt', '↓']} />
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
