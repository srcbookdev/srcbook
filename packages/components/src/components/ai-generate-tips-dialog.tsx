import { useState } from 'react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from './ui/dialog.js';

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
              <li>The AI knows already knows about all of the contents of this notebook.</li>
              <li>It also knows what cell you're updating.</li>
              <li>You can ask the code to add or improve comments or jsdoc.</li>
              <li>You can ask the AI to refactor or rewrite the whole thing.</li>
              <li>
                Try asking the AI to refactor, improve or modularize your code, simply by asking for
                it.
              </li>
            </ul>
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
