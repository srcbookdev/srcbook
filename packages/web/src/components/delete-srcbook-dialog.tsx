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
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

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
    deleteSrcbook({ dir: session.dir })
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="mb-6">Delete "{getTitleForSession(session)}"</DialogTitle>
          <DialogDescription asChild>
            <div>
              <p>Deleting this srcbook is a permanent action and cannot be undone. Are you sure?</p>
            </div>
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-red-500">{error}</p>}
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
