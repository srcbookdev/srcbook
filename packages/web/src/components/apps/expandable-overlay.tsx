'use client';

import { cn } from '@srcbook/components/src/lib/utils';
import { SparklesIcon } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@srcbook/components/src/components/ui/button';
import { Textarea } from '@srcbook/components/src/components/ui/textarea';

export default function ExpandableOverlay() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [message, setMessage] = useState('');
  const overlayRef = useRef<HTMLDivElement>(null);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitted message:', message);
    setMessage('');
    setIsExpanded(false);
  };

  const handleOverlayClick = () => {
    if (!isExpanded) {
      setIsExpanded(true);
    }
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className={cn(
        'fixed bottom-4 right-4 transition-all duration-150 ease-in-out',
        isExpanded
          ? 'border rounded-lg w-96 h-64 bg-primary-foreground'
          : 'w-20 h-20 rounded-full bg-ai border-none',
      )}
    >
      {isExpanded ? (
        <form onSubmit={handleSubmit} className="h-full flex flex-col p-4">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask a follow up"
            className="flex-grow mb-4 resize-none"
          />
          <Button type="submit" className="w-full">
            Submit
          </Button>
        </form>
      ) : (
        <Button className="rounded-full w-full h-full" variant="ai">
          <SparklesIcon className="" size={16} />
        </Button>
      )}
    </div>
  );
}
