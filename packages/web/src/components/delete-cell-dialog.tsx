import { useState } from 'react';
import { Button } from '@srcbook/ui/dist/components/ui/button';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@srcbook/ui/dist/components/ui/dialog';

export default function DeleteCellWithConfirmationModal({
  onDeleteCell,
  children,
}: {
  onDeleteCell: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this cell</DialogTitle>
          <DialogDescription>
            We currently don't support history, are you sure you want to delete it?
          </DialogDescription>
          <div className="flex w-full justify-end items-center gap-2 pt-4 bg-background">
            <Button
              variant="secondary"
              onClick={() => {
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => onDeleteCell()}>
              Delete
            </Button>
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
