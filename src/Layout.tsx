import { Outlet, Link } from 'react-router-dom';
import { LockKeyholeIcon, HomeIcon, SettingsIcon } from 'lucide-react';

export default function Layout() {
  return (
    <div className="flex">
      <nav className="min-h-screen py-3 bg-foreground text-background">
        <div className="flex flex-col justify-between h-full p-2">
          <ul className="flex flex-col space-y-2">
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
          <Link
            to="/settings"
            title="Settings"
            className="flex items-center gap-2 m-2 p-2 rounded-full hover:bg-background hover:text-foreground transition-colors"
          >
            <SettingsIcon className="w-6 h-6" />
            <p>Settings</p>
          </Link>
        </div>
      </nav>
      <div className="flex-1 p-4">
        <div className="max-w-4xl mx-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
