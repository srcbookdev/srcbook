import { useState } from 'react';
import { toast } from 'sonner';
import { sendFeedback } from '@/lib/server';
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
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Share Feedback</DialogTitle>
          <DialogDescription asChild>
            <div className="pt-4 flex flex-col gap-2">
              <p>
                We're always looking to improve Srcbook and your feedback is invaluable.
                <br />
                You can open a public{' '}
                <a
                  className="underline font-medium"
                  href="https://github.com/srcbookdev/srcbook/issues/new"
                >
                  GitHub issue
                </a>{' '}
                or use the form below.
              </p>
              <Textarea
                onChange={(e) => { setFeedback(e.target.value); }}
                placeholder="Share anonymous feedback"
                value={feedback}
              />
              <Input
                onChange={(e) => { setEmail(e.target.value); }}
                placeholder="Email (optional)"
                type="text"
                value={email}
              />
              <Button
                className="self-end"
                disabled={!feedback}
                onClick={() => {
                  sendFeedback({ feedback, email });
                  setFeedback('');
                  setEmail('');
                  toast.info('Thanks for the feedback!');
                  onOpenChange(false);
                }}
              >
                Send
              </Button>
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
