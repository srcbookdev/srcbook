import { useState } from 'react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function AiGenerateTipsDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-[640px] max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Prompt tips</DialogTitle>
          <div className="text-sm">
            <p>Here are a few tips to get the AI to work well for you.</p>
            <ul className="list-disc list-inside py-4 leading-5">
              <li>
                The AI knows about all of the contents of the srcbook, no need to be redundant about
                what this is about.
              </li>
              <li>
                The AI can write code and/or markdown cells. If you want only code, simply specify
                it, and the same goes with markdown.
              </li>
              <li>You can ask the code to add or improve comments or jsdoc.</li>
              <li>
                Be specific, you can give function names and filenames and the AI will know what
                they are.
              </li>
              <li>Try getting the AI to refactor or improve your code, by asking for just that.</li>
            </ul>
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
