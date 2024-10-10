'use client';

import { cn } from '@srcbook/components/src/lib/utils';
import { SparklesIcon, LoaderCircle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@srcbook/components/src/components/ui/button';
import { Textarea } from '@srcbook/components/src/components/ui/textarea';
import { editApp } from '@/lib/server';
import { AppType } from '@srcbook/shared';
import { useFiles } from './use-files';

type PropsType = {
  app: AppType;
};
export default function ExpandableOverlay(props: PropsType) {
  const { updateFile, openFile, files } = useFiles();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const overlayRef = useRef<HTMLDivElement>(null);

  console.log(files);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(event.target as Node)) {
        if (isExpanded) {
          setIsExpanded(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitted message:', message);
    setIsLoading(true);
    const response = await editApp(props.app.id, message);
    console.log('response in overlay.tsx', response);

    // Update files based on the response
    if (response.data && Array.isArray(response.data)) {
      response.data.forEach(
        async (fileUpdate: { type: 'file'; filename: string; content: string }) => {
          console.log('fileUpdate', fileUpdate);
          if (fileUpdate.type === 'file') {
            // First, open the file. Very bad basename logic
            const openedFile = await openFile({
              type: 'file',
              name: fileUpdate.filename.split('/').pop() || '',
              path: fileUpdate.filename,
            });
            console.log('openedFile', openedFile);
            // Then get the file from files
            const file = files.find((file) => file.path === fileUpdate.filename);
            if (file) {
              console.log('found file', file);
              await updateFile(file, { source: fileUpdate.content });
            } else {
              console.error('file not found', fileUpdate.filename);
            }
          }
        },
      );
    }

    setMessage('');
    setIsExpanded(false);
    setIsLoading(false);
  };

  const handleOverlayClick = () => {
    if (!isExpanded) {
      setIsExpanded(true);
    }
  };

  if (isLoading) {
    return (
      <div
        ref={overlayRef}
        onClick={handleOverlayClick}
        className={cn(
          'fixed bottom-12 left-12 transition-all duration-150 ease-in-out w-20 h-20 rounded-full bg-ai border-none',
        )}
      >
        <Button className="rounded-full w-full h-full" variant="ai">
          <LoaderCircle className="animate-spin" size={24} />
        </Button>
      </div>
    );
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className={cn(
        'fixed bottom-12 left-12 transition-all duration-150 ease-in-out',
        isExpanded
          ? 'border border-ai-border rounded-lg w-96 h-64 bg-primary-foreground text-primary'
          : 'w-20 h-20 rounded-full bg-ai border-none',
      )}
    >
      {isExpanded ? (
        <form onSubmit={handleSubmit} className="h-full flex flex-col p-4">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask a follow up"
            className="flex-grow mb-4 resize-none text-primary border border-foreground"
          />
          <Button variant="ai" type="submit" className="w-full">
            Make changes
          </Button>
        </form>
      ) : (
        <Button className="rounded-full w-full h-full" variant="ai">
          <SparklesIcon className="" size={24} />
        </Button>
      )}
    </div>
  );
}
