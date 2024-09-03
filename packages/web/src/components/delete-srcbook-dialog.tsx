import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { getTitleForSession } from '@/lib/utils';
import { deleteSrcbook } from '@/lib/server';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { SessionType } from '../types';

export default function DeleteSrcbookModal({
  open,
  onOpenChange,
  session,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: SessionType | undefined;
}) {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  if (!session) return;

  const onConfirmDelete = async () => {
    deleteSrcbook({ id: session.id })
      .then(() => {
        onOpenChange(false);
        navigate('/', { replace: true });
      })
      .catch((err: Error) => {
        console.error(err);
        setError('Something went wrong. Please try again.');
        setTimeout(() => { setError(null); }, 3000);
      });
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete "{getTitleForSession(session)}"?</DialogTitle>
          <DialogDescription asChild>
            <div>
              <p className="text-foreground">Deleting a Srcbook cannot be undone.</p>
            </div>
          </DialogDescription>
        </DialogHeader>
        {error ? <p className="text-destructive">{error}</p> : null}
        <div className="flex justify-end space-x-2">
          <Button onClick={() => { onOpenChange(false); }} variant="secondary">
            Cancel
          </Button>
          <Button onClick={onConfirmDelete} variant="destructive">
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
