import { createContext, useContext } from 'react';

import type { AppType } from '@srcbook/shared';

export interface AppContextValue {
  app: AppType;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

type ProviderPropsType = {
  app: AppType;
  children: React.ReactNode;
};

export function AppProvider({ app, children }: ProviderPropsType) {
  return <AppContext.Provider value={{ app }}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  return useContext(AppContext) as AppContextValue;
}
