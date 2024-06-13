import { exportSrcmdFile } from '@/lib/server';
import { SessionType } from '@/types';
import { useState } from 'react';
import { ExportLocationPicker } from '@/components/file-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function SaveModal({
  open,
  onOpenChange,
  session,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: SessionType;
}) {
  const [error, setError] = useState<string | null>(null);

  async function onSave(directory: string, filename: string) {
    try {
      exportSrcmdFile(session.id, { directory, filename });
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      setError('Something went wrong. Please try again.');
      setTimeout(() => setError(null), 3000);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Save to file</DialogTitle>
          <DialogDescription asChild>
            <div>
              <p>
                Export your Srcbook to a <code>.srcmd</code> file. This file can be shared and
                imported into any Srcbook application.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <ExportLocationPicker onSave={onSave} />
        {error && <p className="text-red-500">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
