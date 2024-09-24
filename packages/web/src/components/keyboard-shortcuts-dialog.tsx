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
    <div className="grid grid-cols-5 w-full py-2">
      <p className="col-span-2">
        <Shortcut keys={keys} />
      </p>
      <p className="col-span-3">{description}</p>
    </div>
  );
}

export default function KeyboardShortcutsDialog({
  readOnly,
  open,
  onOpenChange,
}: {
  readOnly?: boolean;
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
              <ShortcutRow keys={['?']} description="show this dialog" />
              <ShortcutRow keys={['mod', ';']} description="open package.json" />
              <ShortcutRow keys={['mod', 'i']} description="open npm package install modal" />
              {!readOnly ? (
                <>
                  <h5 className="font-semibold pt-6 pb-2">Markdown edit</h5>
                  <ShortcutRow keys={['esc']} description="switch back to preview mode" />
                  <ShortcutRow keys={['mod', '↵']} description="switch back to preview mode" />
                  <h5 className="font-semibold pt-6 pb-2">Code cell edit</h5>
                  <ShortcutRow keys={['mod', '↵']} description="run cell" />
                  <ShortcutRow keys={['mod', '/']} description="toggle lines comment" />
                  <ShortcutRow keys={['alt', '↑']} description="move lines up" />
                  <ShortcutRow keys={['alt', '↓']} description="move lines down" />
                  <ShortcutRow
                    keys={['shift', 'alt', 'f']}
                    description="format code using Prettier"
                  />
                  <ShortcutRow keys={['alt', 'click']} description="go to definition" />
                </>
              ) : null}
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
