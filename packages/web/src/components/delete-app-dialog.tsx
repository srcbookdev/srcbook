import { deleteApp } from '@/clients/http/apps';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@srcbook/components/src/components/ui/dialog';
import { Button } from '@srcbook/components/src/components/ui/button';
import { AppType } from '@srcbook/shared';

type PropsType = {
  app: AppType;
  onClose: () => void;
  onDeleted: () => void;
};

export default function DeleteAppModal({ app, onClose, onDeleted }: PropsType) {
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    try {
      await deleteApp(app.id);
      onDeleted();
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again.');
      setTimeout(() => setError(null), 3000);
    }
  }

  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        open === false && onClose();
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete "{app.name}"?</DialogTitle>
          <DialogDescription asChild>
            <div>
              <p className="text-foreground">Deleting an App cannot be undone.</p>
            </div>
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-destructive">{error}</p>}
        <div className="flex justify-end space-x-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
