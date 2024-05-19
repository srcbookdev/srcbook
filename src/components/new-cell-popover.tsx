import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

export default function NewCellPopover({
  createNewCell,
  children,
}: {
  createNewCell: (type: 'code' | 'markdown') => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger>{children}</PopoverTrigger>
        <PopoverContent className="w-fit">
          <p className="font-semibold text-center">Insert cell</p>
          <div className="flex items-center justify-center gap-2 p-2">
            <Button
              variant="outline"
              onClick={() => {
                createNewCell('code');
                setOpen(false);
              }}
            >
              Code
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                createNewCell('markdown');
                setOpen(false);
              }}
            >
              Markdown
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
