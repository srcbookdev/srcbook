import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function NewCellPopover({
  createNewCell,
}: {
  createNewCell: (type: 'code' | 'markdown') => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger>
          <button className="p-2 border rounded-full hover:bg-foreground hover:text-background hover:border-background transition-all active:translate-y-0.5">
            <Plus size={24} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-fit">
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
