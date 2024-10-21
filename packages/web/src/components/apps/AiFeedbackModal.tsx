import * as React from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@srcbook/components';
import TextareaAutosize from 'react-textarea-autosize';

interface AiFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (feedback: string) => void;
}

export function AiFeedbackModal({ isOpen, onClose, onSubmit }: AiFeedbackModalProps) {
  const [feedback, setFeedback] = React.useState('');

  const handleSubmit = () => {
    onSubmit(feedback);
    setFeedback('');
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Provide Feedback</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <TextareaAutosize
            placeholder="Tell us more about what went wrong..."
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            onKeyDown={handleKeyDown}
            minRows={3}
            maxRows={10}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Submit Feedback</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
