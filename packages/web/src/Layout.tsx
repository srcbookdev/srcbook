import { NavLink } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { SrcbookLogo } from './components/logos';
import useTheme from './components/use-theme';

export default function Layout(props: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      <div className="flex flex-col">
        <header className="h-8 min-h-8 max-h-8 w-full flex items-center justify-between fixed bg-background z-10 border-b border-border text-sm">
          <nav className="px-6 flex-1">
            <ul className="flex items-center space-x-6">
              <li>
                <NavLink to="/">
                  <h1 className="font-mono font-bold flex items-center space-x-[10px]">
                    <SrcbookLogo size={20} />
                    <span>Srcbook</span>
                  </h1>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/"
                  className="font-semibold text-tertiary-foreground visited:text-tertiary-foreground hover:text-foreground transition-colors"
                >
                  Home
                </NavLink>
              </li>
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
            </ul>
          </nav>
          {process.env.NODE_ENV !== 'production' && (
            <div className="pr-3">
              <button
                onClick={toggleTheme}
                className="border-none outline-none text-muted-foreground hover:text-foreground font-semibold transition-colors"
              >
                {theme === 'light' ? '(DEV) Dark mode' : '(DEV) Light mode'}
              </button>
            </div>
          )}
        </header>
        <div className="w-full max-w-[936px] mx-auto px-4 lg:px-0 py-12 mt-8">{props.children}</div>
      </div>
      <Toaster position="top-right" offset="20px" closeButton />
    </>
  );
}
