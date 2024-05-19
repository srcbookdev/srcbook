import { useLoaderData } from 'react-router-dom';
import { Outlet, Link } from 'react-router-dom';
import { LockKeyholeIcon, HomeIcon, SettingsIcon } from 'lucide-react';
import { getNodeVersion } from '@/lib/server';

export async function loader() {
  const { result } = await getNodeVersion();
  return result;
}

export default function Layout() {
  const version = useLoaderData() as string;
  return (
    <div className="flex">
      <nav className="h-screen fixed bg-foreground text-background">
        <div className="flex flex-col justify-between h-full">
          <ul className="flex flex-col space-y-2 p-2">
            <li>
              <Link
                to="/"
                title="Home"
                className="flex items-center gap-2 p-2 rounded-full hover:bg-background hover:text-foreground transition-colors"
              >
                <HomeIcon className="w-6 h-6" />
                <p>Home</p>
              </Link>
            </li>
            <li>
              <Link
                to="/secrets"
                title="Secrets"
                className="flex items-center gap-2 p-2 rounded-full hover:bg-background hover:text-foreground transition-colors"
              >
                <LockKeyholeIcon className="w-6 h-6" />
                <p>Secrets</p>
              </Link>
            </li>
          </ul>
          <div className="flex flex-col">
            <Link
              to="/settings"
              title="Settings"
              className="flex items-center gap-2 m-2 p-2 rounded-full hover:bg-background hover:text-foreground transition-colors"
            >
              <SettingsIcon className="w-6 h-6" />
              <p>Settings</p>
            </Link>
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
