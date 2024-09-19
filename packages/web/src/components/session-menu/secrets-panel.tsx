import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  getSecrets,
  associateSecretWithSession,
  disassociateSecretWithSession,
} from '@/lib/server';
import { Switch } from '@/components/ui/switch';
import { SessionMenuPanelContentsProps } from '.';

type PropsType = Pick<SessionMenuPanelContentsProps, 'session'>;

export default function SessionMenuPanelSecrets({ session }: PropsType) {
  const [secrets, setSecrets] = useState<{ name: string; checked: boolean }[]>([]);

  useEffect(() => {
    const run = async () => {
      try {
        const { result: secretsWithAssociations } = await getSecrets();

        const secrets = secretsWithAssociations.map((s) => ({
          name: s.name,
          checked: s.associatedWithSessionIds.includes(session.id),
        }));

        setSecrets(secrets);
      } catch (err) {
        console.error('Error loading secrets', err);
        return;
      }
    };

    run();
  }, []);

  async function onChangeSecretEnabled(secretName: string, enabled: boolean) {
    try {
      const operation = enabled ? associateSecretWithSession : disassociateSecretWithSession;
      await operation(session.id, secretName);
    } catch (err) {
      console.error(`Error toggling secret ${secretName}`, err);
      toast.error('Error enabling/disabling secret!');
      return;
    }
  }

  return (
    <>
      <h4 className="text-lg font-semibold leading-tight mb-2">Secrets</h4>
      <h6 className="mb-4 text-tertiary-foreground">Available in this srcbook</h6>

      <div>
        {secrets.map((secret) => (
          <label
            key={secret.name}
            htmlFor={`secret-${secret.name}`}
            className="flex items-center justify-between h-8 font-mono cursor-pointer"
          >
            {secret.name}

            <Switch
              id={`secret-${secret.name}`}
              checked={secret.checked}
              onCheckedChange={(checked) => onChangeSecretEnabled(secret.name, checked)}
            />
          </label>
        ))}
      </div>
    </>
  );
}
