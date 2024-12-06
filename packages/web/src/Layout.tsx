import { useLoaderData } from 'react-router-dom';
import { Toaster } from '@srcbook/components/src/components/ui/sonner';
import { SettingsProvider } from '@/components/use-settings';
import { type SettingsType } from '@/types';
import { getConfig } from '@/lib/server';
import { useAuth } from './AuthContext';
import Login from './components/login';
import useTheme from '@srcbook/components/src/components/use-theme';

export async function loader() {
  const { result: config } = await getConfig();

  return { config };
}

export default function Layout(props: { children: React.ReactNode }) {
  const { config } = useLoaderData() as { config: SettingsType };

  const { user, loading } = useAuth();

  const { theme } = useTheme();

  if (loading) {
    return;
    <div className="flex items-center justify-center min-h-screen">
      <div className="items-center justify-center flex-col p-8 shadow-md rounded-lg text-center flex flex-column">
        <div>Loading...</div>
      </div>
    </div>;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="items-center justify-center flex-col p-8 shadow-md rounded-lg text-center flex flex-column">
          <img
            src="/squadfy-branco.png"
            alt="Squadfy"
            className={`w-24 text-center ${theme == 'light' ? 'invert' : ''}`}
          />
          <h1 className="text-xl font-semibold mb-6">
            Faça login com o seu email Squadfy
            <br />
            para usar a ferramenta SrcBook
          </h1>
          <Login />
        </div>
      </div>
    );
  }

  return (
    <>
      <SettingsProvider config={config}>{props.children}</SettingsProvider>

      <Toaster position="top-right" offset="20px" closeButton />
    </>
  );
}
