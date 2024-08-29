import React from 'react';
import { Sparkles, MessageCircleWarning, X } from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';
import { Button } from '@/components/ui/button';
import AiGenerateTipsDialog from '@/components/ai-generate-tips-dialog';
import { useNavigate } from 'react-router-dom';

interface AiPromptInputProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  onClose: () => void;
  aiEnabled: boolean;
}

export function AiPromptInput({ prompt, setPrompt, onClose, aiEnabled }: AiPromptInputProps) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-start justify-between px-1">
        <div className="flex items-start flex-grow">
          <Sparkles size={16} className="m-2.5" />
          <TextareaAutosize
            className="flex w-full rounded-sm bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none resize-none"
            autoFocus
            placeholder="Ask the AI to edit this cell..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1">
          <AiGenerateTipsDialog>
            <Button size="icon" variant="icon">
              <MessageCircleWarning size={16} />
            </Button>
          </AiGenerateTipsDialog>
          <Button size="icon" variant="icon" onClick={onClose}>
            <X size={16} />
          </Button>
        </div>
      </div>
      {!aiEnabled && (
        <div className="flex items-center justify-between bg-warning text-warning-foreground rounded-sm text-sm px-3 py-1 m-3">
          <p>API key required</p>
          <a className="font-medium underline cursor-pointer" onClick={() => navigate('/settings')}>
            Settings
          </a>
        </div>
      )}
    </div>
  );
}
