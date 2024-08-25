import { createSession, disk, exportSrcmdFile, importSrcbook } from '@/lib/server';
import { getTitleForSession } from '@/lib/utils';
import { FsObjectResultType, FsObjectType, SessionType } from '@/types';
import { useState } from 'react';
import { ExportLocationPicker, FilePicker } from '@/components/file-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import useEffectOnce from './use-effect-once';
import { useNavigate } from 'react-router-dom';

export function ImportSrcbookModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [fsResult, setFsResult] = useState<FsObjectResultType>({ dirname: '', entries: [] });
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffectOnce(() => {
    disk().then((response) => setFsResult(response.result));
  });

  async function onChange(entry: FsObjectType) {
    setError(null);

    if (entry.basename.length > 44) {
      setError('Srcbook title should be less than 44 characters');
      return;
    }

    const { error: importError, result: importResult } = await importSrcbook({ path: entry.path });

    if (importError) {
      setError('There was an error while importing this srcbook.');
      return;
    }

    const { error, result } = await createSession({ path: importResult.dir });

    if (error) {
      setError('There was an error while importing this srcbook.');
      return;
    }

    return navigate(`/srcbooks/${result.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Open Srcbook</DialogTitle>
          <DialogDescription asChild>
            <p>
              Open a Srcbook by importing one from a <code className="code">.src.md</code> file.
            </p>
          </DialogDescription>
        </DialogHeader>
        <FilePicker
          dirname={fsResult.dirname}
          entries={fsResult.entries}
          cta="Open"
          onChange={onChange}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}

export function ExportSrcbookModal({
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
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Save to file</DialogTitle>
          <DialogDescription asChild>
            <p>
              Export this Srcbook to a <code className="code">.src.md</code> file which is shareable
              and can be imported into any Srcbook application.
            </p>
          </DialogDescription>
        </DialogHeader>
        <ExportLocationPicker onSave={onSave} title={getTitleForSession(session)} />
        {error && <p className="text-destructive-foreground">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
