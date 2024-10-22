import { useNavigate } from 'react-router-dom';
import AppLayout from './layout';
import { getLastOpenedFile } from '@/components/apps/local-storage';
import { useApp } from '@/components/apps/use-app';
import { useEffect } from 'react';

export default function AppFiles() {
  const navigateTo = useNavigate();

  const { app } = useApp();

  useEffect(() => {
    const file = getLastOpenedFile(app.id);
    if (file) {
      navigateTo(`/apps/${app.id}/files/${encodeURIComponent(file.path)}`);
    }
  }, [app.id, navigateTo]);

  return (
    <AppLayout activeTab="code" activePanel="explorer">
      <div className="h-full flex items-center justify-center text-tertiary-foreground">
        Use the file explorer to open a file for editing
      </div>
    </AppLayout>
  );
}
