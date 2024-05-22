import { useLoaderData } from 'react-router-dom';
import { Outlet, NavLink } from 'react-router-dom';
import { LockKeyholeIcon, HomeIcon, SettingsIcon } from 'lucide-react';
import { getNodeVersion } from '@/lib/server';
import { cn } from '@/lib/utils';

async function loader() {
  const { result } = await getNodeVersion();
  return result;
}

function Layout() {
  const version = useLoaderData() as string;
  return (
    <div className="flex">
      <nav className="h-screen fixed bg-foreground text-background">
        <div className="flex flex-col justify-between h-full">
          <ul className="flex flex-col space-y-2 p-2">
            <li>
              <NavLink
                to="/"
                title="Home"
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 p-2 rounded-full hover:bg-background hover:text-foreground transition-colors',
                    isActive ? 'underline underline-offset-8' : undefined,
                  )
                }
              >
                <HomeIcon className="w-6 h-6" />
                <p>Home</p>
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
                  )
                }
              >
                <LockKeyholeIcon className="w-6 h-6" />
                <p>Secrets</p>
              </NavLink>
            </li>
          </ul>
          <div className="flex flex-col">
            <NavLink
              to="/settings"
              title="Settings"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 p-2 rounded-full hover:bg-background hover:text-foreground transition-colors',
                  isActive ? 'underline underline-offset-8' : undefined,
                )
              }
            >
              <SettingsIcon className="w-6 h-6" />
              <p>Settings</p>
            </NavLink>
            <p className="mx-2 px-2 text-sm opacity-50 text-center">
              node version
              <br /> {version}
            </p>
          </div>
        </div>
      </nav>
      <div className="flex-1">
        <div className="max-w-4xl mx-auto p-4">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

Layout.loader = loader;
export default Layout;
