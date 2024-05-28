import { exportSession, disk } from '@/lib/server';
import { SessionType, FsObjectType } from '@/types';
import { useEffect, useState } from 'react';
import { FileSaver } from '@/components/file-picker';
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
  const [entries, setEntries] = useState<FsObjectType[]>([]);
  const [dirname, setDirname] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInitialEntries = async () => {
      const { result } = await disk();
      setEntries(result.entries);
      setDirname(result.dirname);
    };
    fetchInitialEntries();
  }, []);

  const onSave = async (path: string) => {
    exportSession(session.id, { filename: path })
      .then(() => {
        onOpenChange(false);
      })
      .catch((err: Error) => {
        console.error(err);
        setError('Something went wrong. Please try again.');
        setTimeout(() => setError(null), 3000);
      });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Save to file</DialogTitle>
          <DialogDescription asChild>
            <div>
              <p>
                Export your notebook to a <code>.srcbookmd</code> file. This file can be shared an
                easily imported into any SourceBook application.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <FileSaver dirname={dirname} entries={entries} onSave={onSave} />
        {error && <p className="text-red-500">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
