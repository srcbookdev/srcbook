import { useState } from 'react';
import { useNavigate, NavLink, Link } from 'react-router-dom';
import {
  PlusIcon,
  ChevronDownIcon,
  SparklesIcon,
  ImportIcon,
  TrashIcon,
  ShareIcon,
  ExternalLinkIcon,
} from 'lucide-react';
import { TitleCellType } from '@srcbook/shared';

import { SessionType } from '@/types';
import { SrcbookLogo } from '@/components/logos';
import { Button } from '@srcbook/components/src/components/ui/button';
import GenerateSrcbookModal from '@/components/generate-srcbook-modal';
import DeleteSrcbookModal from '@/components/delete-srcbook-dialog';
import { ExportSrcbookModal, ImportSrcbookModal } from '@/components/import-export-srcbook-modal';
import useTheme from '@srcbook/components/src/components/use-theme';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@srcbook/components/src/components/ui/dropdown-menu';
import { createSession, createSrcbook } from '@/lib/server';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@srcbook/components/src/components/ui/tooltip';
import { auth } from '../firebaseConfig';

function LightDarkModeDebugChanger() {
  const { theme, toggleTheme } = useTheme();

  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div className="absolute left-1/2 -translate-x-1/2">
      <button
        onClick={toggleTheme}
        className="border-none outline-none text-muted-foreground hover:text-foreground font-semibold transition-colors"
      >
        {theme === 'light' ? '(DEV) Dark mode' : '(DEV) Light mode'}
      </button>
    </div>
  );
}

type SessionNavbarProps = {
  readOnly?: boolean;
  session: SessionType;
  srcbooks: Array<SessionType>;
  title: string;
  baseDir: string;
};

export function SessionNavbar(props: SessionNavbarProps) {
  const navigate = useNavigate();

  const [showGenSrcbookModal, setShowGenSrcbookModal] = useState(false);
  const [showImportSrcbookModal, setShowImportSrcbookModal] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showSave, setShowSave] = useState(false);

  const srcbooks = props.srcbooks.sort((a, b) => b.openedAt - a.openedAt).slice(0, 6);

  async function openSrcbook(path: string) {
    // When switching srcbooks, make sure all the modals are hidden
    setShowGenSrcbookModal(false);
    setShowImportSrcbookModal(false);
    setShowSave(false);

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
    <>
      <GenerateSrcbookModal
        open={showGenSrcbookModal}
        setOpen={setShowGenSrcbookModal}
        openSrcbook={openSrcbook}
      />
      <ImportSrcbookModal open={showImportSrcbookModal} onOpenChange={setShowImportSrcbookModal} />
      <DeleteSrcbookModal open={showDelete} onOpenChange={setShowDelete} session={props.session} />
      <ExportSrcbookModal open={showSave} onOpenChange={setShowSave} session={props.session} />

      <header className="h-12 w-full flex items-center justify-between fixed bg-background z-50 border-b border-border text-sm font-medium">
        <nav className="flex items-center justify-between px-4 flex-1">
          <div className="flex items-center gap-2">
            <NavLink to="/">
              <h1 className="font-mono font-bold flex items-center space-x-[10px] pr-1">
                <SrcbookLogo size={20} />
                <span>Srcbook</span>
              </h1>
            </NavLink>

            <span className="select-none">/</span>

            {srcbooks.length < 2 ? (
              <span className="px-1.5">{props.title}</span>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="icon" className="font-normal px-1.5 active:translate-y-0">
                    <div className="flex items-center gap-1 font-medium">
                      {props.title}
                      <ChevronDownIcon size={12} />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {srcbooks.map((srcbook) => {
                    if (srcbook.id === props.session.id) {
                      return null;
                    }
                    const titleCell = srcbook.cells.find((cell) => cell.type === 'title') as
                      | TitleCellType
                      | undefined;
                    if (!titleCell) {
                      return null;
                    }

                    return (
                      <DropdownMenuItem
                        key={srcbook.id}
                        onClick={() => navigate(`/srcbooks/${srcbook.id}`)}
                        className="cursor-pointer"
                      >
                        {titleCell.text}
                      </DropdownMenuItem>
                    );
                  })}

                  {/* FIXME: how should more than 6 entries be rendered? */}
                  {props.srcbooks.length > 6 ? (
                    <DropdownMenuItem asChild className="cursor-pointer border-t mt-2 pt-2">
                      <Link to="/">See all</Link>
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {!props.readOnly ? (
              <>
                <div className="w-[1px] h-5 bg-border" />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="icon" className="w-8 h-8 p-0 active:translate-y-0">
                      <PlusIcon size={18} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuItem onClick={onCreateSrcbook} className="cursor-pointer">
                      <PlusIcon className="mr-2 h-4 w-4" />
                      <span>Create Srcbook</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        // FIXME: wrap this function calls in a setTimeout so that this runs after the
                        // dropdown menu at least starts closing (ie, removes `pointer-events: none;`)
                        //
                        // Otherwise the Dialog this setState call opens and the DropdownMenu will fight
                        // for control over the body tag styles.
                        setTimeout(() => {
                          setShowGenSrcbookModal(true);
                        }, 0);
                      }}
                      className="cursor-pointer"
                    >
                      <SparklesIcon className="mr-2 h-4 w-4" />
                      <span>Generate Srcbook</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        // FIXME: wrap this function calls in a setTimeout so that this runs after the
                        // dropdown menu at least starts closing (ie, removes `pointer-events: none;`)
                        //
                        // Otherwise the Dialog this setState call opens and the DropdownMenu will fight
                        // for control over the body tag styles.
                        setTimeout(() => {
                          setShowImportSrcbookModal(true);
                        }, 0);
                      }}
                      className="cursor-pointer"
                    >
                      <ImportIcon className="mr-2 h-4 w-4" />
                      <span>Open Notebook</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : null}
          </div>

          <LightDarkModeDebugChanger />

          <div className="flex items-center gap-2">
            {!props.readOnly ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="icon"
                      size="icon"
                      onClick={() => setShowDelete(true)}
                      className="active:translate-y-0"
                    >
                      <TrashIcon size={18} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete this Srcbook</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}
            <Button
              variant="secondary"
              onClick={() => setShowSave(true)}
              className="active:translate-y-0"
            >
              <div className="flex gap-2">
                <ShareIcon size={16} />
                Share
              </div>
            </Button>
          </div>
        </nav>
      </header>
    </>
  );
}

function SocialGithubIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" fill="none" viewBox="0 0 19 19">
      <path
        fill="#8E979D"
        d="M10 .792a9 9 0 00-2.833 17.583c.416.083.75-.375.75-.75v-1.208c-2.5.541-3.292-1.209-3.292-1.209a2.708 2.708 0 00-.917-1.333c-.833-.583.042-.542.042-.542a1.792 1.792 0 011.375.834c.708 1.208 2.292 1.083 2.792.875a2.25 2.25 0 01.208-1.209c-2.833-.5-4.375-2.166-4.375-4.416A4.458 4.458 0 014.958 6.25a2.583 2.583 0 01.125-2.667A3.708 3.708 0 017.75 4.792 6.292 6.292 0 0110 4.458c.76-.023 1.52.075 2.25.292a3.75 3.75 0 012.667-1.167 2.709 2.709 0 01.166 2.667 4.458 4.458 0 011.167 3.167c0 2.25-1.542 3.916-4.375 4.416.18.376.252.794.208 1.209v2.583a.753.753 0 00.792.75A9.043 9.043 0 0010 .792z"
      ></path>
    </svg>
  );
}

function SocialDiscordIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
      <path
        fill="#8E979D"
        d="M18.942 5.556a16.288 16.288 0 00-4.126-1.297c-.178.321-.386.754-.529 1.097a15.15 15.15 0 00-4.573 0A11.73 11.73 0 009.18 4.26c-1.448.25-2.834.693-4.129 1.3-2.611 3.946-3.319 7.794-2.965 11.587a16.495 16.495 0 005.06 2.593c.408-.56.771-1.156 1.084-1.785a10.659 10.659 0 01-1.706-.83c.143-.106.283-.217.418-.331 3.29 1.539 6.866 1.539 10.118 0 .137.114.277.225.418.33a10.63 10.63 0 01-1.71.833c.314.627.675 1.224 1.084 1.785a16.466 16.466 0 005.064-2.595c.415-4.397-.71-8.21-2.973-11.59zM8.678 14.813c-.988 0-1.798-.922-1.798-2.045 0-1.123.792-2.047 1.798-2.047 1.005 0 1.815.922 1.798 2.047.001 1.123-.793 2.045-1.798 2.045zm6.644 0c-.988 0-1.798-.922-1.798-2.045 0-1.123.793-2.047 1.798-2.047 1.006 0 1.816.922 1.798 2.047 0 1.123-.793 2.045-1.798 2.045z"
      ></path>
    </svg>
  );
}

export function Navbar() {
  const logout = function () {
    auth.signOut();
  };

  return (
    <header className="h-12 w-full flex items-center justify-between fixed bg-background z-50 border-b border-border text-sm ">
      <nav className="flex items-center justify-between px-4 flex-1">
        <div className="flex items-center gap-6">
          <NavLink to="/">
            <h1 className="font-mono font-bold flex items-center space-x-[10px]">
              <SrcbookLogo size={20} />
              <span>Srcbook</span>
            </h1>
          </NavLink>

          <ul className="flex items-center gap-6">
            <li>
              <NavLink
                to="/secrets"
                className="font-semibold text-tertiary-foreground visited:text-tertiary-foreground hover:text-foreground transition-colors"
              >
                Secrets
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/settings"
                className="font-semibold text-tertiary-foreground visited:text-tertiary-foreground hover:text-foreground transition-colors"
              >
                Settings
              </NavLink>
            </li>
            <li>
              <a
                href="https://hub.srcbook.com"
                target="_blank"
                className="font-semibold text-tertiary-foreground visited:text-tertiary-foreground hover:text-foreground transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  Hub
                  <ExternalLinkIcon size={14} />
                </div>
              </a>
            </li>
            <li>
              <button className="font-semibold text-tertiary-foreground" onClick={logout}>
                Log out
              </button>
            </li>
          </ul>
        </div>

        <LightDarkModeDebugChanger />

        <div className="flex items-center gap-2">
          <a href="https://discord.gg/shDEGBSe2d" target="_blank">
            <Button variant="icon" size="icon" className="active:translate-y-0">
              <SocialDiscordIcon />
            </Button>
          </a>
          <a href="https://github.com/srcbookdev/srcbook" target="_blank">
            <Button variant="icon" size="icon" className="active:translate-y-0">
              <SocialGithubIcon />
            </Button>
          </a>
        </div>
      </nav>
    </header>
  );
}
