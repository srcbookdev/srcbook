import { useState } from 'react';
import { sendFeedback } from '@/lib/server';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export default function FeedbackDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [feedback, setFeedback] = useState('');
  const [email, setEmail] = useState('');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Share Feedback</DialogTitle>
          <DialogDescription asChild className="pt-4 flex flex-col gap-2">
            <>
              <p className="text-tertiary-foreground">
                We're always looking to improve Srcbook and your feedback is invaluable.
                <br />
                You can open a public{' '}
                <a
                  href="https://github.com/srcbookdev/srcbook/issues/new"
                  className="underline font-medium"
                >
                  GitHub issue
                </a>{' '}
                or use the form below.
              </p>
              <Textarea
                placeholder="Share anonymous feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
              <Input
                type="text"
                value={email}
                placeholder="Email (optional)"
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button
                disabled={!feedback}
                onClick={() => {
                  sendFeedback({ feedback, email });
                  setFeedback('');
                  setEmail('');
                  toast.info('Thanks for the feedback!');
                  onOpenChange(false);
                }}
                className="self-end"
              >
                Send
              </Button>
            </>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
