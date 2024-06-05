import { deleteSession } from '@/lib/server';
import type { SessionType } from '@/types';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function DeleteSessionModal({
  open,
  onOpenChange,
  session,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: SessionType;
}) {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const onConfirmDelete = async () => {
    deleteSession({ id: session.id })
      .then(() => {
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
          <DialogTitle>Delete this session</DialogTitle>
          <DialogDescription asChild>
            <div>
              <p>
                Deleting this session is a permanent action and cannot be undone. Are you sure want
                to proceed?
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-red-500">{error}</p>}
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
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
