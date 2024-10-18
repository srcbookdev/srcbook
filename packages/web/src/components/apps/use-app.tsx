import { createContext, useContext, useState } from 'react';
import type { AppType } from '@srcbook/shared';
import { updateApp as doUpdateApp } from '@/clients/http/apps';

export interface AppContextValue {
  app: AppType;
  updateApp: (attrs: { name: string }) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

type ProviderPropsType = {
  app: AppType;
  children: React.ReactNode;
};

export function AppProvider({ app: initialApp, children }: ProviderPropsType) {
  const [app, setApp] = useState(initialApp);

  async function updateApp(attrs: { name: string }) {
    const { data: updatedApp } = await doUpdateApp(app.id, attrs);
    setApp(updatedApp);
  }

  return <AppContext.Provider value={{ app, updateApp }}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  return useContext(AppContext) as AppContextValue;
}
