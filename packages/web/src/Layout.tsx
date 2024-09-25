import { useLoaderData } from 'react-router-dom';
import { Toaster } from '@srcbook/ui/dist/components/ui/sonner';
import { SettingsProvider } from '@/components/use-settings';
import { type SettingsType } from '@/types';
import { getConfig } from '@/lib/server';

export async function loader() {
  const { result: config } = await getConfig();

  return { config };
}

export default function Layout(props: { children: React.ReactNode }) {
  const { config } = useLoaderData() as { config: SettingsType };

  return (
    <>
      <SettingsProvider config={config}>{props.children}</SettingsProvider>

      <Toaster position="top-right" offset="20px" closeButton />
    </>
  );
}
