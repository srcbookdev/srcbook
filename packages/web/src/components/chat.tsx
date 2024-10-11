import { cn } from '@/lib/utils';
import { Button, ScrollArea, Textarea } from '@srcbook/components';
import { ArrowUp, X, Paperclip, History } from 'lucide-react';
import { Markdown } from './markdown';
import * as React from 'react';

const text = `\`Create a simple timer react app, using Tailwind, & Shadcn\`
Certainly! I'll create a simple timer React app using Tailwind CSS and ShadCN UI components. Here's a step-by-step guide to set up and create the app:
1. Set up the project:
   - Create a new React project using Create React App or Vite
   - Install Tailwind CSS and configure it
   - Install ShadCN UI components

2. Create the Timer component:
   - Set up state for minutes, seconds, and isRunning
   - Implement start, pause, and reset functionality
   - Use useEffect to handle the timer logic

3. Style the app using Tailwind CSS:
   - Create a centered layout
   - Style the timer display
   - Add buttons for start, pause, and reset

4. Enhance the UI with ShadCN components:
   - Use the Button component for controls
   - Implement a Card component to wrap the timer

5. Add additional features:
   - Include an input for setting custom times
   - Implement sound notifications when the timer ends

Here's the complete code for the Timer component:

\`\`\`jsx
import React, { useState, useEffect } from 'react';
import { Button, Card } from '@shadcn/ui';

const Timer = () => {
  const [minutes, setMinutes] = useState(5);
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let interval;
    if (isRunning) {
      interval = setInterval(() => {
        if (seconds > 0) {
          setSeconds(seconds - 1);
        } else if (minutes > 0) {
          setMinutes(minutes - 1);
          setSeconds(59);
        } else {
          clearInterval(interval);
          setIsRunning(false);
          // Play sound notification
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, minutes, seconds]);

  const startTimer = () => setIsRunning(true);
  const pauseTimer = () => setIsRunning(false);
  const resetTimer = () => {
    setIsRunning(false);
    setMinutes(5);
    setSeconds(0);
  };

  return (
    <Card className="p-6 max-w-sm mx-auto mt-10">
      <div className="text-4xl font-bold text-center mb-4">
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </div>
      <div className="flex justify-center space-x-2">
        <Button onClick={startTimer} disabled={isRunning}>
          Start
        </Button>
        <Button onClick={pauseTimer} disabled={!isRunning}>
          Pause
        </Button>
        <Button onClick={resetTimer}>Reset</Button>
      </div>
    </Card>
  );
};

export default Timer;
\`\`\`

To use this Timer component in your main App.js:

\`\`\`jsx
import React from 'react';
import Timer from './Timer';

function App() {
  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold text-center mt-10 mb-5">
        React Timer App
      </h1>
      <Timer />
    </div>
  );
}

export default App;
\`\`\`

This simple timer app demonstrates the use of React hooks, Tailwind CSS for styling, and ShadCN UI components for enhanced UI elements. You can further customize and expand upon this basic implementation to add more features or adjust the styling to your preferences.
`;

function AIStream(): React.JSX.Element {
  return (
    <div className="rounded-xl bg-sb-core-0 w-[440px] border px-2 py-1 shadow-xl max-h-[75vh] overflow-y-hidden">
      <div className="pb-2 flex justify-between items-center">
        <span className="px-2">Chat</span>
        <span className="flex">
          <Button variant="icon" className="h-7 w-7 p-1.5 border-none">
            <History size={18} className="text-sb-core-80" />
          </Button>
          <Button variant="icon" className="h-7 w-7 p-1.5 border-none">
            <X size={18} className="text-sb-core-80" />
          </Button>
        </span>
      </div>
      <ScrollArea className="max-h-[calc(75vh-40px)] overflow-y-auto">
        <Markdown>{text}</Markdown>
      </ScrollArea>
    </div>
  );
}

function Chat(): React.JSX.Element {
  // hook bools, configure with logic when connecting to backend
  const active: boolean = true;
  const first: boolean = false;

  return (
    <div className="rounded-xl bg-sb-core-0 w-[440px] border px-2 py-1 hover:border-sb-purple-60 shadow-xl">
      <Textarea
        placeholder={first ? 'Ask anything or select ...' : 'Ask a follow up'}
        className="w-full resize-none border-none shadow-none focus:outline-none! focus:ring-0! focus:border-none! caret-sb-purple-60 overflow-hidden"
        onInput={(e) => {
          // @ts-expect-error -- this is just some magic that TS doesn't find types for
          e.target.style.height = 'auto';
          // @ts-expect-error -- same is going on here, this does work find just a types issue
          e.target.style.height = e.target.scrollHeight + 'px';
        }}
      />
      <span className="flex justify-end mt-2">
        <Button variant="icon" className="h-7 w-7 p-1.5 border-none">
          <Paperclip size={18} className="text-sb-core-80" />
        </Button>
        <Button
          className={cn(
            'h-7 w-7 p-1.5 foxus:outline-none border-none',
            active ? 'bg-sb-purple-60 hover:bg-sb-purple-80' : 'bg-sb-core-20 hover:bg-sb-core-20',
          )}
        >
          <ArrowUp size={18} />
        </Button>
      </span>
    </div>
  );
}

export function ChatPanel(): React.JSX.Element {
  return (
    <div className="fixed bottom-4 right-4 grid gap-1">
      <AIStream />
      <Chat />
    </div>
  );
}
