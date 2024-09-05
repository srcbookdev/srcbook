import { useNavigate, NavLink, Link } from 'react-router-dom';
import { PlusIcon, ChevronDownIcon, SparklesIcon, ImportIcon } from 'lucide-react';
import { TitleCellType } from '@srcbook/shared';

import { cn } from '@/lib/utils';
import { SessionType } from '@/types';
import { SrcbookLogo } from '@/components/logos';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuShortcut, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { createSession, createSrcbook } from '@/lib/server';

type SessionNavbarProps = {
  session: SessionType;
  srcbooks: Array<SessionType>;
  title: string;
  baseDir: string;
};

function SessionNavbar(props: SessionNavbarProps) {
  const navigate = useNavigate();

  async function openSrcbook(path: string) {
    const { result: srcbook } = await createSession({ path });
    navigate(`/srcbooks/${srcbook.id}`);
  }

  async function onCreateSrcbook() {
    const { result } = await createSrcbook({
      path: props.baseDir,
      name: 'Untitled',

      // FIXME: copy the same language as the currently visible srcbook - should this be less
      // implicit?
      language: props.session.language,
    });
    openSrcbook(result.path);
  }

  return (
    <header className="h-12 w-full flex items-center justify-between fixed bg-background z-10 border-b border-border text-sm">
      <nav className="px-4 flex-1">
        <div className="flex items-center gap-2">
          <NavLink to="/">
            <h1 className="font-mono font-bold flex items-center space-x-[10px] pr-1">
              <SrcbookLogo size={20} />
              <span>Srcbooks</span>
            </h1>
          </NavLink>

          <span className="select-none">/</span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {/* FIXME: the button when unfocused and clicked nudges down slightly? What's going on there? */}
              <Button variant="icon" className="font-normal px-1">
                <div className="flex items-center gap-1">
                  {props.title}
                  <ChevronDownIcon size={12} />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {props.srcbooks
                .sort((a, b) => b.openedAt - a.openedAt)
                .slice(0, 6)
                .map((srcbook) => {
                  if (srcbook.id === props.session.id) {
                    return null;
                  }
                  const titleCell = srcbook.cells.find(cell => cell.type === "title") as TitleCellType | undefined;
                  if (!titleCell) {
                    return null;
                  }

                  // FIXME: clicking these links seems to put the app in a weird state, where
                  // the `props.session` value / etc are for the previous srcbook
                  return (
                    <DropdownMenuItem
                      key={srcbook.id}
                      onClick={() => navigate(`/srcbooks/${srcbook.id}`)}
                    >
                      {titleCell.text}
                    </DropdownMenuItem>
                  );
                })
              }

              {/* FIXME: how should more than 6 entries be rendered? */}
              {props.srcbooks.length > 6 ? (
                <DropdownMenuItem asChild>
                  <Link to="/">More...</Link>
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="w-[1px] h-5 bg-border" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {/* FIXME: the button when unfocused and clicked nudges down slightly? What's going on there? */}
              <Button variant="icon" className="w-8 h-8 p-0">
                <PlusIcon size={18} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem onClick={onCreateSrcbook}>
                <PlusIcon className="mr-2 h-4 w-4" />
                <span>Create Srcbook</span>
                <DropdownMenuShortcut>⌘N</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <SparklesIcon className="mr-2 h-4 w-4" />
                <span>Generate Srcbook</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <ImportIcon className="mr-2 h-4 w-4" />
                <span>Open Srcbook</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
    </header>
  );
}

export default SessionNavbar;
