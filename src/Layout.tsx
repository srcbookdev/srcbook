import { useLoaderData } from 'react-router-dom';
import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { LockKeyholeIcon, HomeIcon, SettingsIcon, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { getNodeVersion } from '@/lib/server';
import { cn } from '@/lib/utils';

async function loader() {
  const { result } = await getNodeVersion();
  return result;
}

function Layout() {
  const version = useLoaderData() as string;
  const [mode, setMode] = useState<'icons' | 'list'>('icons');

  return (
    <div className="flex">
      <nav
        className={cn(
          'h-screen fixed bg-foreground text-background transition-all flex flex-col',
          mode === 'icons' ? 'w-20' : 'w-32',
        )}
      >
        <div
          className="flex w-full items-center justify-center gap-2 py-3 px-2 opacity-60 hover:opacity-100 hover:cursor-pointer"
          onClick={() => setMode(mode === 'list' ? 'icons' : 'list')}
        >
          {mode === 'list' && <p className="font-mono text-xs">Srcbook</p>}
          {mode === 'icons' ? <ChevronsRight /> : <ChevronsLeft />}
        </div>
        <hr className="mx-4 opacity-10" />
        <div className="flex flex-col justify-between h-full pt-2">
          <ul className="flex flex-col space-y-2 p-2">
            <li>
              <NavLink
                to="/"
                title="Home"
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 p-2 rounded-full hover:bg-background hover:text-foreground transition-colors',
                    isActive ? 'underline underline-offset-8' : undefined,
                    mode === 'icons' ? 'justify-center' : 'justify-start',
                  )
                }
              >
                <HomeIcon className="w-6 h-6" />
                {mode === 'list' && <p>Home</p>}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/secrets"
                title="Secrets"
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 p-2 rounded-full hover:bg-background hover:text-foreground transition-colors',
                    isActive ? 'underline underline-offset-8' : undefined,
                    mode === 'icons' ? 'justify-center' : 'justify-start',
                  )
                }
              >
                <LockKeyholeIcon className="w-6 h-6" />
                {mode === 'list' && <p>Secrets</p>}
              </NavLink>
            </li>
          </ul>
          <div className="flex flex-col p-2">
            <NavLink
              to="/settings"
              title="Settings"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 p-2 rounded-full hover:bg-background hover:text-foreground transition-colors',
                  isActive ? 'underline underline-offset-8' : undefined,
                  mode === 'icons' ? 'justify-center' : 'justify-start',
                )
              }
            >
              <SettingsIcon className="w-6 h-6" />
              {mode === 'list' && <p>Settings</p>}
            </NavLink>
            {mode === 'list' && (
              <p className="mx-2 px-2 text-xs opacity-50 text-center">
                node version
                <br /> {version}
              </p>
            )}
          </div>
        </div>
      </nav>
      <div className={cn('flex-1', mode === 'icons' ? 'pl-20' : 'pl-32')}>
        <div className="max-w-4xl mx-auto p-4">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

Layout.loader = loader;
export default Layout;
