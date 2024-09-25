import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  getSecrets,
  createSecret,
  associateSecretWithSession,
  disassociateSecretWithSession,
} from '@/lib/server';
import { Switch } from '@srcbook/ui/dist/components/ui/switch';
import { SessionMenuPanelContentsProps } from '.';
import { Button } from '@srcbook/ui/dist/components/ui/button';
import { Input } from '@srcbook/ui/dist/components/ui/input';
import { isValidSecretName } from '@/lib/utils';

type PropsType = Pick<SessionMenuPanelContentsProps, 'session'>;

export default function SessionMenuPanelSecrets({ session }: PropsType) {
  const [secrets, setSecrets] = useState<{ name: string; checked: boolean }[]>([]);
  const [showForm, setShowForm] = useState(false);

  async function loadSecrets() {
    try {
      const { result: secretsWithAssociations } = await getSecrets();

      const secrets = secretsWithAssociations.map((s) => ({
        name: s.name,
        checked: s.associatedWithSessionIds.includes(session.id),
      }));

      setSecrets(secrets.reverse());
    } catch (err) {
      console.error('Error loading secrets', err);
      return;
    }
  }

  useEffect(() => {
    loadSecrets();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleSecret(secretName: string) {
    setSecrets((secrets) =>
      secrets.map((s) => {
        return s.name === secretName ? { ...s, checked: !s.checked } : s;
      }),
    );
  }

  async function onChangeSecretEnabled(secretName: string, enabled: boolean) {
    toggleSecret(secretName); // optimistic update

    try {
      const operation = enabled ? associateSecretWithSession : disassociateSecretWithSession;
      await operation(session.id, secretName);
    } catch (err) {
      toggleSecret(secretName); // undo optimistic update
      console.error(`Error toggling secret ${secretName}`, err);
      toast.error('Error enabling/disabling secret!');
      return;
    }
  }

  async function onSecretAdded(secretName: string) {
    setShowForm(false);
    await loadSecrets();
    toggleSecret(secretName);
    await associateSecretWithSession(session.id, secretName);
  }

  return (
    <>
      <h4 className="text-lg font-semibold leading-tight mb-2">Secrets</h4>

      <div className="flex items-center justify-between">
        {showForm ? (
          <InlineForm onSecretAdded={onSecretAdded} />
        ) : (
          <>
            <p className="text-tertiary-foreground">Enable secrets below</p>
            <Button variant="secondary" onClick={() => setShowForm(true)}>
              Add secret
            </Button>
          </>
        )}
      </div>

      <div className="mt-8">
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

function InlineForm(props: { onSecretAdded: (name: string) => void }) {
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [error, _setError] = useState<string | null>(null);

  function setError(error: string | null) {
    if (error === null) {
      _setError(null);
      return;
    }

    _setError(error);
    setTimeout(() => _setError(null), 5000);
  }

  function isValidSecret() {
    return isValidSecretName(name) && value.length > 0;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    _setError(null);

    try {
      await createSecret({ name, value });
    } catch (err) {
      console.error('Error creating secret', err);
      setError('Error creating secret');
      return;
    }

    props.onSecretAdded(name);

    setName('');
    setValue('');
  }

  return (
    <div className="flex flex-col gap-1.5">
      <form name="inline-secret-form" className="flex items-center space-x-4" onSubmit={onSubmit}>
        <Input
          required
          autoComplete="off"
          placeholder="SECRET_NAME"
          value={name}
          onChange={(e) => setName(e.currentTarget.value.toUpperCase())}
        />
        <Input
          required
          autoComplete="off"
          value={value}
          onChange={(e) => setValue(e.currentTarget.value)}
          placeholder="secret-value"
        />
        <Button type="submit" variant="secondary" disabled={!isValidSecret()}>
          Add
        </Button>
      </form>
      {error && <p className="text-error text-[13px]">{error}</p>}
    </div>
  );
}
