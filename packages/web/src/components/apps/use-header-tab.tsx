import React, { createContext, useContext, useState } from 'react';

export type HeaderTab = 'code' | 'preview';

export interface HeaderTabContextValue {
  tab: HeaderTab;
  switchTab: (newTab: HeaderTab) => void;
}

const HeaderTabContext = createContext<HeaderTabContextValue | undefined>(undefined);

type ProviderPropsType = {
  children: React.ReactNode;
};

export function HeaderTabProvider({ children }: ProviderPropsType) {
  const [tab, setTab] = useState<HeaderTab>('code');

  return (
    <HeaderTabContext.Provider value={{ tab, switchTab: setTab }}>
      {children}
    </HeaderTabContext.Provider>
  );
}

export function useHeaderTab(): HeaderTabContextValue {
  return useContext(HeaderTabContext) as HeaderTabContextValue;
}
