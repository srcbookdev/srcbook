import { Outlet, NavLink } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { SrcbookLogo } from './components/logos';

export default function Layout() {
  return (
    <>
      <div className="flex flex-col">
        <header className="p-6">
          <nav>
            <ul className="flex items-center space-x-8">
              <li>
                <NavLink to="/">
                  <h1 className="font-mono font-bold text-lg flex items-center space-x-[10px]">
                    <SrcbookLogo />
                    <span>Srcbook</span>
                  </h1>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/"
                  className="text-muted-foreground visited:text-muted-foreground hover:text-foreground transition-colors"
                >
                  Home
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/secrets"
                  className="text-muted-foreground visited:text-muted-foreground hover:text-foreground transition-colors"
                >
                  Secrets
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/settings"
                  className="text-muted-foreground visited:text-muted-foreground hover:text-foreground transition-colors"
                >
                  Settings
                </NavLink>
              </li>
            </ul>
          </nav>
        </header>
        <div className="w-full max-w-4xl mx-auto p-6">
          <Outlet />
        </div>
      </div>
      <Toaster position="top-right" />
    </>
  );
}
