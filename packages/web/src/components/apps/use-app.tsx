import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { AppType } from '@srcbook/shared';
import { updateApp as doUpdateApp } from '@/clients/http/apps';
import { AppChannel } from '@/clients/websocket';

export interface AppContextValue {
  app: AppType;
  channel: AppChannel;
  updateApp: (attrs: { name: string }) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

type ProviderPropsType = {
  app: AppType;
  children: React.ReactNode;
};

export function AppProvider({ app: initialApp, children }: ProviderPropsType) {
  const [app, setApp] = useState(initialApp);

  const channelRef = useRef(AppChannel.create(app.id));

  // This is only meant to be run one time, when the component mounts.
  useEffect(() => {
    channelRef.current.subscribe();
    return () => channelRef.current.unsubscribe();
  }, []);

  useEffect(() => {
    if (app.id === channelRef.current.appId) {
      return;
    }

    channelRef.current.unsubscribe();
    channelRef.current = AppChannel.create(app.id);
  }, [app.id]);

  async function updateApp(attrs: { name: string }) {
    const { data: updatedApp } = await doUpdateApp(app.id, attrs);
    setApp(updatedApp);
  }

  return (
    <AppContext.Provider value={{ app, updateApp, channel: channelRef.current }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  return useContext(AppContext) as AppContextValue;
}
