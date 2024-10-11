'use client';

import { cn } from '@srcbook/components/src/lib/utils';
import { SparklesIcon, LoaderCircle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@srcbook/components/src/components/ui/button';
import { Textarea } from '@srcbook/components/src/components/ui/textarea';
import { aiEditApp } from '@/clients/http/apps.js';
import { AppType } from '@srcbook/shared';
import { useFiles } from './use-files';

type FileType = {
  basename: string;
  dirname: string;
  type: 'file';
  content: string;
  filename: string;
  description: string;
};
type CommandType = {
  type: 'command';
  content: string;
  description: string;
};

type PlanItemType = FileType | CommandType;

type PropsType = {
  app: AppType;
};
export default function ExpandableOverlay(props: PropsType) {
  const { createFile } = useFiles();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const overlayRef = useRef<HTMLDivElement>(null);
  const [summary, setSummary] = useState<Array<PlanItemType>>([]);

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
    const response = await aiEditApp(props.app.id, message);
    console.log('response in overlay.tsx', response);

    // Update files based on the response
    if (response.data && Array.isArray(response.data)) {
      setSummary(response.data as Array<PlanItemType>);
      response.data.forEach(async (fileUpdate: PlanItemType) => {
        console.log('updating file', fileUpdate);
        if (fileUpdate.type === 'file') {
          await createFile(fileUpdate.dirname, fileUpdate.basename, fileUpdate.content);
        } else if (fileUpdate.type === 'command') {
          console.log('command', fileUpdate.content);
        }
      });
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

  if (summary.length > 0) {
    return (
      <div
        ref={overlayRef}
        onClick={handleOverlayClick}
        className={cn(
          'fixed bottom-12 left-12 transition-all duration-150 ease-in-out border border-sb-yellow-20 rounded-lg w-[500px] h-64 bg-primary-foreground text-primary p-2 bg-sb-yellow-10 overflow-auto',
        )}
      >
        <div className="flex flex-col justify-between min-h-full">
          <div>
            {summary.map((item: PlanItemType) => {
              if (item.type === 'file') {
                return (
                  <p key={item.basename}>
                    <span className="text-sm font-mono">{item.filename}</span>:{' '}
                    <span className="text-sm opacity-60 line-clamp-1">{item.description}</span>
                  </p>
                );
              } else if (item.type === 'command') {
                return (
                  <div key={item.content}>
                    <p className="text-sm font-mono">
                      Run command: <span className="font-mono">{item.content}</span>
                    </p>
                    <p className="text-xs opacity-50">{item.description}</p>
                  </div>
                );
              }
            })}
          </div>
          <div className="flex items-center w-full gap-2">
            <Button
              variant="ghost"
              className="flex-grow border border-sb-yellow-20"
              onClick={() => setSummary([])}
              disabled
            >
              Revert
            </Button>
            <Button className="flex-grow" onClick={() => setSummary([])}>
              Done
            </Button>
          </div>
        </div>
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
