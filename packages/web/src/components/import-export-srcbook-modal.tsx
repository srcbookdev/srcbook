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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/underline-flat-tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import SrcMdUploadDropZone from '@/components/srcmd-upload-drop-zone';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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

    if (file.name.length > 44) {
      setLoading(false);
      setError('Srcbook title should be less than 44 characters');
      return;
    }

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

    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch (err) {
      console.error(`Cannot parse ${url} as url:`, err);
      setLoading(false);
      setError(`Cannot parse ${url} as a url!`);
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
          <div className="border-b mb-4">
            <TabsList>
              <TabsTrigger value="file">
                <div className="flex items-center gap-2">
                  <FileUpIcon size={18} />
                  Upload file
                </div>
              </TabsTrigger>
              <TabsTrigger value="url">
                <div className="flex items-center gap-2">
                  <GlobeIcon size={18} />
                  Import URL
                </div>
              </TabsTrigger>
              <TabsTrigger value="clipboard">
                <div className="flex items-center gap-2">
                  <FileCodeIcon size={18} />
                  Paste source
                </div>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent className="mt-0" value="file">
            <SrcMdUploadDropZone onDrop={onCreateSrcbookFromFilesystem} />
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

  function onDownloadSrcbook() {
    if (srcbookText.status !== 'complete') {
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
  }

  function onCopySrcbookToClipboard() {
    if (srcbookText.status !== 'complete') {
      return;
    }

    onOpenChange(false);
    navigator.clipboard.writeText(srcbookText.text);
    toast.success('Copied to clipboard.');
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
              <Button onClick={onDownloadSrcbook}>Download File</Button>
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
