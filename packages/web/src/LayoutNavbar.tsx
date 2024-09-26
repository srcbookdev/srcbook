import { useLoaderData } from 'react-router-dom';
import { Toaster } from '@srcbook/components/src/components/ui/sonner';
import { SettingsProvider } from '@/components/use-settings';
import { type SettingsType } from '@/types';
import { getConfig } from '@/lib/server';
import { Navbar } from './components/navbar';

export async function loader() {
  const { result: config } = await getConfig();

  return { config };
}

export default function LayoutNavbar(props: { children: React.ReactNode }) {
  const { config } = useLoaderData() as { config: SettingsType };

  return (
    <>
      <div className="flex flex-col">
        <Navbar />

        <SettingsProvider config={config}>
          <div className="w-full max-w-[936px] mx-auto px-4 lg:px-0 py-12 mt-8">
            {props.children}
          </div>
        </SettingsProvider>
      </div>
      <Toaster position="top-right" offset="20px" closeButton />
    </>
  );
}
