import { useNavigate } from 'react-router-dom';
import {
  FileCodeIcon,
  FileDownIcon,
  FileUpIcon,
  GlobeIcon,
  Loader2Icon,
  NotebookIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { createSession, exportSrcmdText, importSrcbook } from '@/lib/server';
import { getTitleForSession } from '@/lib/utils';
import { SessionType } from '@/types';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@srcbook/components/src/components/ui/underline-flat-tabs';
import { showSaveFilePicker } from '@/lib/file-system-access';
import { Input } from '@srcbook/components/src/components/ui/input';
import { Textarea } from '@srcbook/components/src/components/ui/textarea';
import { Button } from '@srcbook/components/src/components/ui/button';
import SrcMdUploadDropZone from '@/components/srcmd-upload-drop-zone';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@srcbook/components/src/components/ui/dialog';

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

  // "url" tab
  const [url, setUrl] = useState('');
  const urlInputRef = useRef<HTMLInputElement | null>(null);

  // "clipboard" tab:
  const [clipboard, setClipboard] = useState('');
  const clipboardTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // When changing tabs, focus the inputs on each tab
  useEffect(() => {
    setTimeout(() => {
      switch (activeTab) {
        case 'url':
          urlInputRef.current?.focus();
          break;
        case 'clipboard':
          clipboardTextareaRef.current?.focus();
          break;
      }
    }, 0);
  }, [activeTab]);

  // When hiding the modal, reset all controls
  useEffect(() => {
    if (!open) {
      return;
    }

    setActiveTab('file');
    setUrl('');
    setClipboard('');
  }, [open]);

  const navigate = useNavigate();

  async function onCreateSrcbookFromFilesystem(file: File) {
    setError(null);
    setLoading(true);

    const text = await file.text();
    const { error: importError, result: importResult } = await importSrcbook({ text });

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

  function onChangeTab(tab: string) {
    setActiveTab(tab as 'file' | 'url' | 'clipboard');

    // Reset state on tab change
    setError(null);
    setUrl('');
    setClipboard('');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Open Srcbook</DialogTitle>
          <DialogDescription asChild>
            <p>Use one of the options below to open a Srcbook.</p>
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={onChangeTab}>
          <div className="border-b mb-4">
            <TabsList>
              <TabsTrigger disabled={loading} value="file">
                <div className="flex items-center gap-2">
                  <FileUpIcon size={18} />
                  Upload file
                </div>
              </TabsTrigger>
              <TabsTrigger disabled={loading} value="url">
                <div className="flex items-center gap-2">
                  <GlobeIcon size={18} />
                  Import URL
                </div>
              </TabsTrigger>
              <TabsTrigger disabled={loading} value="clipboard">
                <div className="flex items-center gap-2">
                  <FileCodeIcon size={18} />
                  Paste source
                </div>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent className="mt-0" value="file">
            <SrcMdUploadDropZone onDrop={onCreateSrcbookFromFilesystem} className="h-[160px]" />
          </TabsContent>
          <TabsContent className="mt-0" value="url">
            <div className="flex gap-2 w-full">
              <Input
                ref={urlInputRef}
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://hub.srcbook.com/srcbooks/srcbook-to-import.src.md"
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
            <div className="flex flex-col gap-4 h-[160px]">
              <Textarea
                ref={clipboardTextareaRef}
                value={clipboard}
                onChange={(event) => setClipboard(event.target.value)}
                placeholder="Paste clipboard here"
                className="min-h-[112px] resize-vertical"
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
  const [activeTab, setActiveTab] = useState<'file' | 'text'>('file');

  const clipboardTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [srcbookText, setSrcbookText] = useState<
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'complete'; text: string }
    | { status: 'error' }
  >({ status: 'idle' });
  useEffect(() => {
    if (!open) {
      return;
    }

    const run = async () => {
      setSrcbookText({ status: 'loading' });

      let text;
      try {
        text = await exportSrcmdText(session.id);
      } catch (error) {
        console.error('Error export srcbook as text:', error);
        setSrcbookText({ status: 'error' });
        return;
      }

      setSrcbookText({ status: 'complete', text });
    };
    run();
  }, [open, session.id]);

  // When changing tabs, focus the inputs on each tab
  useEffect(() => {
    setTimeout(() => {
      switch (activeTab) {
        case 'text':
          clipboardTextareaRef.current?.focus();
          clipboardTextareaRef.current?.select();
          break;
      }
    }, 0);
  }, [activeTab]);

  // When hiding the modal, reset all controls
  useEffect(() => {
    if (!open) {
      return;
    }

    setActiveTab('file');
  }, [open]);

  const downloadFileName = useMemo(() => {
    const fileNameWithoutExtension = getTitleForSession(session)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    return `${fileNameWithoutExtension}.src.md`;
  }, [session]);

  async function onDownloadSrcbook() {
    if (srcbookText.status !== 'complete') {
      return;
    }

    // If the file system access api is available (as of september 2024, this is only chrome), then
    // use this rather than just downloading a file.
    if (typeof showSaveFilePicker !== 'undefined') {
      let fileHandle;
      try {
        fileHandle = await showSaveFilePicker({
          id: 'srcbookExportFile',
          suggestedName: downloadFileName,
        });
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          // The user quit out of the save picker without selecting a location
          return;
        }

        console.error('Error getting file handle:', err);
        return;
      }

      const writable = await fileHandle.createWritable();
      await writable.write(srcbookText.text);
      await writable.close();

      onOpenChange(false);

      toast.success(`Saved ${fileHandle.name}.`, { duration: 2000 });

      return;
    }

    const blob = new Blob([srcbookText.text]);

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', downloadFileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Saved ${downloadFileName}.`, { duration: 2000 });
  }

  function onCopySrcbookToClipboard() {
    if (srcbookText.status !== 'complete') {
      return;
    }

    onOpenChange(false);
    navigator.clipboard.writeText(srcbookText.text);
    toast.success('Copied to clipboard.', { duration: 2000 });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Export Srcbook</DialogTitle>
          <DialogDescription asChild>
            <p>
              Export this Srcbook to a <code className="code">.src.md</code> file which is shareable
              and can be imported into any Srcbook application.
            </p>
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(tab) => setActiveTab(tab as 'file' | 'text')}>
          <div className="border-b mb-4">
            <TabsList>
              <TabsTrigger value="file">
                <div className="flex items-center gap-2">
                  <FileDownIcon size={18} />
                  Download file
                </div>
              </TabsTrigger>
              <TabsTrigger value="text">
                <div className="flex items-center gap-2">
                  <FileCodeIcon size={18} />
                  Copy source
                </div>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent className="mt-0" value="file">
            <div className="flex flex-col gap-4 w-full items-center justify-center h-[160px] border border-dashed rounded-md cursor-default">
              <div className="flex flex-col items-center gap-2 text-tertiary-foreground">
                <NotebookIcon size={24} />
                <code className="text-xs">{downloadFileName}</code>
              </div>
              <Button onClick={onDownloadSrcbook}>
                {typeof showSaveFilePicker !== 'undefined' ? 'Save File' : 'Download File'}
              </Button>
            </div>
          </TabsContent>
          <TabsContent className="mt-0" value="text">
            <div className="flex flex-col gap-4">
              <Textarea
                ref={clipboardTextareaRef}
                value={srcbookText.status === 'complete' ? srcbookText.text : ''}
                className="font-mono text-xs whitespace-pre min-h-[112px] resize-vertical"
                readOnly
              />
              <div className="flex justify-end">
                <Button type="button" onClick={onCopySrcbookToClipboard}>
                  Copy to Clipboard
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
