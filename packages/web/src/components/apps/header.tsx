import {
  ShareIcon,
  PlayIcon,
  StopCircleIcon,
  EllipsisIcon,
  PlayCircleIcon,
  Code2Icon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { SrcbookLogo } from '@/components/logos';

import { Button } from '@srcbook/components/src/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@srcbook/components/src/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@srcbook/components/src/components/ui/dialog';
import { cn } from '@/lib/utils';
import { usePackageJson } from './use-package-json';
import { useApp } from './use-app';
import { Input } from '@srcbook/components';
import { useState } from 'react';
import { usePreview } from './use-preview';

export type EditorHeaderTab = 'code' | 'preview';

type PropsType = {
  className?: string;
  tab: EditorHeaderTab;
  onChangeTab: (newTab: EditorHeaderTab) => void;
  onShowPackagesPanel: () => void;
};

export default function EditorHeader(props: PropsType) {
  const { app, updateApp } = useApp();
  const { start: startPreview, stop: stopPreview, status: previewStatus } = usePreview();
  const { status: npmInstallStatus, nodeModulesExists } = usePackageJson();

  const [nameChangeDialogOpen, setNameChangeDialogOpen] = useState(false);

  return (
    <>
      {nameChangeDialogOpen && (
        <UpdateAppNameDialog
          name={app.name}
          onUpdate={(name) => {
            updateApp({ name });
            setNameChangeDialogOpen(false);
          }}
          onClose={() => {
            setNameChangeDialogOpen(false);
          }}
        />
      )}
      <header
        className={cn(
          'w-full flex items-center justify-between bg-background z-50 text-sm border-b border-b-border relative',
          props.className,
        )}
      >
        <Link to="/" className="px-4" title="Home">
          <SrcbookLogo size={20} />
        </Link>
        <nav className="flex items-center justify-between px-2 flex-1">
          <div className="flex items-center gap-2">
            <button
              className="px-2 text-sm font-medium"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setNameChangeDialogOpen(true);
              }}
            >
              {app.name}
            </button>
          </div>

          <div className="absolute left-1/2 -translate-x-1/2 flex bg-inline-code h-7 rounded-sm">
            <button
              className={cn(
                'flex gap-2 justify-center items-center w-24 text-foreground rounded-sm font-medium',
                {
                  'bg-background border border-border': props.tab === 'code',
                },
              )}
              onClick={() => props.onChangeTab('code')}
            >
              <Code2Icon size={14} />
              Code
            </button>
            <button
              className={cn(
                'flex gap-2 justify-center items-center w-24 text-foreground rounded-sm font-medium',
                {
                  'bg-background border border-border': props.tab === 'preview',
                },
              )}
              onClick={() => props.onChangeTab('preview')}
            >
              <PlayIcon size={14} />
              Preview
            </button>
          </div>

          <div className="flex items-center gap-2">
            {props.tab === 'preview' && previewStatus === 'stopped' ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="icon"
                      size="icon"
                      onClick={startPreview}
                      className="active:translate-y-0"
                      disabled={nodeModulesExists !== true}
                    >
                      <PlayCircleIcon size={18} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Start dev server</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}
            {props.tab === 'preview' && previewStatus !== 'stopped' ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="icon"
                      size="icon"
                      onClick={() => {
                        stopPreview();
                        props.onChangeTab('code');
                      }}
                      className="active:translate-y-0"
                      disabled={previewStatus === 'booting' || previewStatus === 'connecting'}
                    >
                      <StopCircleIcon size={18} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Stop dev server</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}

            <div
              className={cn('w-[1px] h-6 bg-border mx-2', { invisible: props.tab !== 'preview' })}
            />

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="icon"
                    size="icon"
                    onClick={() => alert('Export')}
                    className="active:translate-y-0"
                  >
                    <ShareIcon size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export app</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="icon"
                    size="icon"
                    onClick={() => alert('More options')}
                    className="active:translate-y-0"
                  >
                    <EllipsisIcon size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>More options</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </nav>
      </header>
    </>
  );
}

function UpdateAppNameDialog(props: {
  name: string;
  onClose: () => void;
  onUpdate: (name: string) => void;
}) {
  const [name, setName] = useState(props.name);

  return (
    <Dialog
      defaultOpen={true}
      onOpenChange={(open) => {
        if (!open) {
          props.onClose();
        }
      }}
    >
      <DialogContent hideClose>
        <DialogHeader>
          <DialogTitle>Rename app</DialogTitle>
          <DialogDescription className="sr-only">Rename this app</DialogDescription>
          <div className="pt-2">
            <Input value={name} onChange={(e) => setName(e.currentTarget.value)} />
          </div>
          <div className="flex w-full justify-end items-center gap-2 pt-4 bg-background">
            <Button variant="secondary" onClick={props.onClose}>
              Cancel
            </Button>
            <Button onClick={() => props.onUpdate(name)} disabled={name.trim() === ''}>
              Save
            </Button>
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
