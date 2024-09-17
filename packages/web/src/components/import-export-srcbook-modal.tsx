import { useNavigate } from 'react-router-dom';
import { ClipboardIcon, FilesIcon, GlobeIcon, Loader2Icon } from 'lucide-react';
import { createSession, disk, exportSrcmdFile, importSrcbook } from '@/lib/server';
import { getTitleForSession } from '@/lib/utils';
import { FsObjectResultType, FsObjectType, SessionType } from '@/types';
import { useEffect, useRef, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/underline-flat-tabs';
import { ExportLocationPicker, FilePicker } from '@/components/file-picker';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import useEffectOnce from './use-effect-once';

export function ImportSrcbookModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'file' | 'url' | 'clipboard'>('file');
  // "file" tab:
  const [fsResult, setFsResult] = useState<FsObjectResultType>({ dirname: '', entries: [] });

  // "url" tab
  const [url, setUrl] = useState('');
  const urlInputRef = useRef<HTMLInputElement | null>(null);

  // "clipboard" tab:
  const [clipboard, setClipboard] = useState('');
  const clipboardTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setTimeout(() => {
      switch (activeTab) {
        case 'url':
          setUrl("");
          urlInputRef.current?.focus();
          break;
        case 'clipboard':
          setClipboard("");
          clipboardTextareaRef.current?.focus();
          break;
      }
    }, 0);
  }, [activeTab]);

  const navigate = useNavigate();

  useEffectOnce(() => {
    disk().then((response) => setFsResult(response.result));
  });

  async function onCreateSrcbookFromFilesystem(entry: FsObjectType) {
    setError(null);
    setLoading(true);

    if (entry.basename.length > 44) {
      setLoading(false);
      setError('Srcbook title should be less than 44 characters');
      return;
    }

    const { error: importError, result: importResult } = await importSrcbook({ path: entry.path });

    if (importError) {
      setLoading(false);
      setError('There was an error while importing this srcbook.');
      return;
    }

    const { error, result } = await createSession({ path: importResult.dir });

    if (error) {
      setLoading(false);
      setError('There was an error while importing this srcbook.');
      return;
    }

    setActiveTab('file');
    setLoading(false);
    onOpenChange(false);
    return navigate(`/srcbooks/${result.id}`);
  }

  async function onCreateSrcbookFromUrl(url: string) {
    setError(null);
    setLoading(true);

    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch (err) {
      console.error(`Cannot parse ${url} as url:`, err);
      setLoading(false);
      setError(`Cannot parse ${url} as a url!`);
      return;
    }

    const fileName = (
      parsedUrl.pathname.length > 0 ? parsedUrl.pathname.split('/').at(-1)! : url
    ).replace(/[^a-zA-Z0-9_-]/g, '');

    if (fileName.length > 44) {
      setLoading(false);
      setError('Srcbook title should be less than 44 characters');
      return;
    }

    const { error: importError, result: importResult } = await importSrcbook({ url });

    if (importError) {
      setLoading(false);
      setError('There was an error while importing this srcbook.');
      return;
    }

    const { error, result } = await createSession({ path: importResult.dir });

    if (error) {
      setLoading(false);
      setError('There was an error while importing this srcbook.');
      return;
    }

    setActiveTab('file');
    setLoading(false);
    onOpenChange(false);
    return navigate(`/srcbooks/${result.id}`);
  }

  async function onCreateSrcbookFromClipboard(clipboard: string) {
    setError(null);
    setLoading(true);

    const { error: importError, result: importResult } = await importSrcbook({ text: clipboard });

    if (importError) {
      setLoading(false);
      setError('There was an error while importing this srcbook.');
      return;
    }

    const { error, result } = await createSession({ path: importResult.dir });

    if (error) {
      setLoading(false);
      setError('There was an error while importing this srcbook.');
      return;
    }

    setActiveTab('file');
    setLoading(false);
    onOpenChange(false);
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

        <Tabs
          value={activeTab}
          onValueChange={(tab) => setActiveTab(tab as 'file' | 'url' | 'clipboard')}
        >
          <TabsList className="h-10 mb-4">
            <TabsTrigger value="file">
              <div className="flex items-center gap-2">
                <FilesIcon size={18} />
                From Filesystem
              </div>
            </TabsTrigger>
            <TabsTrigger value="url">
              <div className="flex items-center gap-2">
                <GlobeIcon size={18} />
                From URL
              </div>
            </TabsTrigger>
            <TabsTrigger value="clipboard">
              <div className="flex items-center gap-2">
                <ClipboardIcon size={18} />
                From Clipboard
              </div>
            </TabsTrigger>
          </TabsList>

          <TabsContent className="mt-0" value="file">
            <FilePicker
              dirname={fsResult.dirname}
              entries={fsResult.entries}
              cta="Open"
              onChange={onCreateSrcbookFromFilesystem}
            />
          </TabsContent>
          <TabsContent className="mt-0" value="url">
            <div className="flex gap-2 w-full">
              <Input
                ref={urlInputRef}
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="eg: https://example.com/my-fancy-srcbook.src.md"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onCreateSrcbookFromUrl(url);
                  }
                }}
              />
              <Button
                type="button"
                onClick={() => onCreateSrcbookFromUrl(url)}
                disabled={url.length === 0 || loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2Icon size={18} className="animate-spin" />
                    Loading...
                  </div>
                ) : (
                  'Create'
                )}
              </Button>
            </div>
          </TabsContent>
          <TabsContent className="mt-0" value="clipboard">
            <div className="flex flex-col gap-4">
              <Textarea
                ref={clipboardTextareaRef}
                value={clipboard}
                onChange={(event) => setClipboard(event.target.value)}
                placeholder="Paste clipboard here"
                className="h-[128px] resize-none"
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={() => onCreateSrcbookFromClipboard(clipboard)}
                  disabled={clipboard.length === 0 || loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <Loader2Icon size={18} className="animate-spin" />
                      Loading...
                    </div>
                  ) : (
                    'Create'
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
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
