import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export default function DeleteCellWithConfirmationModal({
  onDeleteCell,
  children,
}: {
  onDeleteCell: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this cell</DialogTitle>
          <DialogDescription>
            We currently don't support history, are you sure you want to delete it?
          </DialogDescription>
          <div className="flex w-full justify-end items-center gap-2 pt-4 bg-background">
            <Button
              onClick={() => {
                setOpen(false);
              }}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button onClick={() => { onDeleteCell(); }} variant="destructive">
              Delete
            </Button>
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
