import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useApp } from './use-app';
import { commitVersion, getCurrentVersion } from '@/clients/http/apps';

interface Version {
  sha: string;
  message?: string;
}

interface VersionContextType {
  currentVersion: Version | null;
  commitFiles: (message: string) => Promise<void>;
  checkout: (sha: string) => Promise<void>;
  fetchVersions: () => Promise<void>;
}

const VersionContext = createContext<VersionContextType | undefined>(undefined);

export const VersionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { app } = useApp();
  //   TODO implement this
  //   const { refreshFiles } = useFiles();
  const [currentVersion, setCurrentVersion] = useState<Version | null>(null);

  const fetchVersion = useCallback(async () => {
    if (!app) return;

    try {
      const currentVersionResponse = await getCurrentVersion(app.id);
      setCurrentVersion({ sha: currentVersionResponse.sha });
    } catch (error) {
      console.error('Error fetching current version:', error);
    }
  }, [app]);

  useEffect(() => {
    fetchVersion();
  }, [fetchVersion]);

  const commitFiles = useCallback(
    async (message: string) => {
      if (!app) return;

      try {
        const response = await commitVersion(app.id, message);
        setCurrentVersion({ sha: response.sha, message });
      } catch (error) {
        console.error('Error committing files:', error);
      }
    },
    [app],
  );

  const checkout = useCallback(
    async (sha: string) => {
      if (!app) return;

      try {
        const response = await fetch(`/api/apps/${app.id}/checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sha }),
        });
        if (!response.ok) throw new Error('Failed to checkout version');
        await fetchVersion();
        // await refreshFiles();
      } catch (error) {
        console.error('Error checking out version:', error);
      }
    },
    [app, fetchVersion],
  );

  return (
    <VersionContext.Provider
      value={{ currentVersion, commitFiles, checkout, fetchVersions: fetchVersion }}
    >
      {children}
    </VersionContext.Provider>
  );
};

export const useVersion = () => {
  const context = useContext(VersionContext);
  if (context === undefined) {
    throw new Error('useVersion must be used within a VersionProvider');
  }
  return context;
};
