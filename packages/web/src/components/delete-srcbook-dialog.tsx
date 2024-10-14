import { deleteSrcbook } from '@/lib/server';
import { useNavigate } from 'react-router-dom';
import { getTitleForSession } from '@/lib/utils';
import { useState } from 'react';
import type { SessionType } from '../types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@srcbook/components/src/components/ui/dialog';
import { Button } from '@srcbook/components/src/components/ui/button';

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
        setTimeout(() => setError(null), 3000);
      });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete "{getTitleForSession(session)}"?</DialogTitle>
          <DialogDescription asChild>
            <div>
              <p className="text-foreground">Deleting a Notebook cannot be undone.</p>
            </div>
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-destructive">{error}</p>}
        <div className="flex justify-end space-x-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirmDelete}>
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
