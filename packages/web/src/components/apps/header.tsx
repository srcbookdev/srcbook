import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  ChevronDownIcon,
  ShareIcon,
  Trash2Icon,
  Play,
  StopCircle,
  PlayCircle,
} from 'lucide-react';
import type { AppType, CodeLanguageType } from '@srcbook/shared';

import { SrcbookLogo } from '@/components/logos';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import DeleteAppModal from '../delete-app-dialog';
import { useState } from 'react';
import CreateAppModal from './create-modal';
import { createApp } from '@/clients/http/apps';
import { cn } from '@/lib/utils';
import { usePreview } from './use-preview';

type PropsType = {
  app: AppType;
  apps: AppType[];
  className?: string;
};

export default function AppHeader(props: PropsType) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { start: startPreview, stop: stopPreview, status: previewStatus } = usePreview();

  function togglePreview() {
    if (previewStatus === 'running') {
      stopPreview();
    } else if (previewStatus === 'stopped') {
      startPreview();
    }
  }

  const navigate = useNavigate();

  const app = props.app;
  const apps = props.apps.filter((a) => a.id !== app.id);

  async function onCreateApp(name: string, language: CodeLanguageType, prompt?: string) {
    const { data: app } = await createApp({ name, language, prompt });
    navigate(`/apps/${app.id}`);
    setShowCreateModal(false);
  }

  return (
    <>
      {showCreateModal && (
        <CreateAppModal onClose={() => setShowCreateModal(false)} onCreate={onCreateApp} />
      )}
      {showDeleteModal && (
        <DeleteAppModal
          app={app}
          onClose={() => setShowDeleteModal(false)}
          onDeleted={() => navigate('/')}
        />
      )}
      <header
        className={cn(
          'w-full flex items-center justify-between bg-background z-50 border-b border-border text-sm',
          props.className,
        )}
      >
        <nav className="flex items-center justify-between px-4 flex-1">
          <div className="flex items-center gap-2">
            <NavLink to="/">
              <h1 className="font-mono font-bold flex items-center space-x-[10px] pr-1">
                <SrcbookLogo size={20} />
                <span>Srcbook</span>
              </h1>
            </NavLink>

            <span className="select-none">/</span>

            {apps.length === 0 ? (
              <span className="px-1.5">{app.name}</span>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="icon" className="font-normal px-1.5 active:translate-y-0">
                    <div className="flex items-center gap-1">
                      {app.name}
                      <ChevronDownIcon size={12} />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {apps.map((a) => (
                    <DropdownMenuItem
                      key={a.id}
                      onClick={() => navigate(`/apps/${a.id}`)}
                      className="cursor-pointer"
                    >
                      {a.name}
                    </DropdownMenuItem>
                  ))}

                  {/* FIXME: how should more than 6 entries be rendered? */}
                  {apps.length > 6 ? (
                    <DropdownMenuItem asChild className="cursor-pointer border-t mt-2 pt-2">
                      <Link to="/">See all</Link>
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <div className="w-[1px] h-5 bg-border" />

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="icon"
                    className="w-8 h-8 p-0 active:translate-y-0"
                    onClick={() => setShowCreateModal(true)}
                  >
                    <PlusIcon size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Create a new app</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="icon"
                    size="icon"
                    onClick={() => setShowDeleteModal(true)}
                    className="active:translate-y-0"
                  >
                    <Trash2Icon size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete this app</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              variant="secondary"
              onClick={() => alert('Export')}
              className="active:translate-y-0"
            >
              <div className="flex gap-2">
                <ShareIcon size={16} />
                Export
              </div>
            </Button>
            <Button
              onClick={togglePreview}
              className="active:translate-y-0 gap-1.5"
              disabled={!(previewStatus === 'stopped' || previewStatus === 'running')}
            >
              {previewStatus === 'stopped' && <PlayCircle size={16} />}
              {previewStatus === 'running' && <StopCircle size={16} />}
              Preview
            </Button>
          </div>
        </nav>
      </header>
    </>
  );
}
