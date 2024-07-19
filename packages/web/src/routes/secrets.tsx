import { useRef, useState } from 'react';
import { getSecrets } from '@/lib/server';
import { Info, Trash2 } from 'lucide-react';
import { Form, useLoaderData, useRevalidator } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { updateSecret, createSecret, deleteSecret } from '@/lib/server';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

async function loader() {
  const { result } = await getSecrets();
  return { secrets: result };
}

function isValidSecretName(name: string) {
  return /^[A-Z0-9_]+$/.test(name);
}

function Secrets() {
  const { secrets } = useLoaderData() as { secrets: Record<string, string> };

  return (
    <>
      <h1 className="text-2xl my-4">Secrets</h1>

      <p>
        Secrets are a safe way utilize API tokens or other private credentials in Srcbooks. These
        are available in code cells via <code className="code">process.env.SECRET_NAME</code>.
      </p>

      <div className="mt-12 space-y-6">
        <NewSecretForm />
        <SecretsTable secrets={secrets} />
      </div>
    </>
  );
}

function SecretsTable(props: { secrets: Record<string, string> }) {
  const revalidator = useRevalidator();

  async function onUpdate(name: string, updatedName: string, updatedValue: string) {
    // TODO handle errors
    await updateSecret({
      previousName: name,
      name: updatedName,
      value: updatedValue,
    });

    revalidator.revalidate();
  }

  async function onDelete(name: string) {
    await deleteSecret({ name });
    revalidator.revalidate();
  }

  const sortedSecrets = Object.entries(props.secrets).sort(([nameA], [nameB]) =>
    nameA.localeCompare(nameB),
  );

  return (
    Object.keys(sortedSecrets).length > 0 && (
      <div className="relative w-full overflow-auto">
        <table className="w-full space-y-2">
          <thead>
            <tr className="text-sm text-tertiary-foreground">
              <th className="h-10 pl-3 text-left align-middle">Name</th>
              <th className="h-10 pl-3 text-left align-middle">Value</th>
              <th className="h-10 pl-3 text-right align-middle w-[52px]"></th>
            </tr>
          </thead>
          <tbody>
            {sortedSecrets.map(([name, value]) => (
              <SecretRow
                key={name}
                name={name}
                value={value}
                onUpdate={onUpdate}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>
      </div>
    )
  );
}

function SecretRow(props: {
  name: string;
  value: string;
  onUpdate: (name: string, updatedName: string, updatedValue: string) => void;
  onDelete: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(props.name);
  const [value, setValue] = useState(props.value);

  const nameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const [hovering, setHovering] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  function onNameKeydown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      nameRef.current?.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      // Revert to original name
      setName(props.name);
      // Timeout needed for this component to re-render before
      // we blur, otherwise it'll use an old state value rather than
      // the value we just set above.
      setTimeout(() => nameRef.current?.blur(), 10);
    }
  }

  function onPasswordKeydown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      passwordRef.current?.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      // Revert to original value
      setValue(props.value);
      // Timeout needed for this component to re-render before
      // we blur, otherwise it'll use an old state value rather than
      // the value we just set above.
      setTimeout(() => passwordRef.current?.blur(), 10);
    }
  }

  function onBlur() {
    setInputFocused(false);
    if (isValidSecretName(name)) {
      props.onUpdate(props.name, name, value);
    } else {
      setName(props.name);
    }
  }

  return (
    <tr
      className="transition-all group"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete <code className="code">{name}</code>
            </DialogTitle>
            <DialogDescription>Are you sure you want to delete this secret?</DialogDescription>
            <div className="flex w-full justify-end items-center gap-2 pt-4 bg-background">
              <Button
                variant="secondary"
                onClick={() => {
                  setOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => props.onDelete(name)}>
                Delete
              </Button>
            </div>
          </DialogHeader>
        </DialogContent>
      </Dialog>
      <td className="h-10 pr-3 text-left align-middle lg:w-[434px]">
        <Input
          ref={nameRef}
          value={name}
          onKeyDown={onNameKeydown}
          onChange={(e) => setName(e.currentTarget.value.toUpperCase())}
          autoComplete="off"
          onFocus={() => setInputFocused(true)}
          onBlur={onBlur}
          className="border-transparent group-hover:border-border group-focus-within:border-border"
        />
      </td>
      <td className="h-10 text-left align-middle">
        <Input
          ref={passwordRef}
          type={inputFocused || hovering ? 'text' : 'password'}
          autoComplete="off"
          value={value}
          onKeyDown={onPasswordKeydown}
          onChange={(e) => setValue(e.currentTarget.value)}
          required
          onFocus={() => setInputFocused(true)}
          onBlur={onBlur}
          className="border-transparent group-hover:border-border group-focus-within:border-border"
        />
      </td>
      <td className="h-10 pl-3 text-right align-middle w-[52px]">
        <Button variant="icon" onClick={() => setOpen(true)}>
          <Trash2 size={18} />
        </Button>
      </td>
    </tr>
  );
}

function NewSecretForm() {
  const revalidator = useRevalidator();

  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!isValidSecretName(name)) {
      setError(
        'Secret names must be uppercase and can only contain letters, numbers, and underscores.',
      );
      return;
    }

    await createSecret({ name, value });
    setName('');
    setValue('');
    revalidator.revalidate();
  }

  return (
    <div className="space-y-6">
      <Form method="post" className="flex items-center gap-3" onSubmit={onSubmit}>
        <Input
          type="text"
          name="name"
          required
          autoComplete="off"
          placeholder="name"
          value={name}
          onChange={(e) => setName(e.currentTarget.value.toUpperCase())}
          className={cn(error && 'border-error focus-visible:ring-error')}
        />

        <Input
          type="text"
          name="value"
          required
          autoComplete="off"
          placeholder="value"
          value={value}
          onChange={(e) => setValue(e.currentTarget.value)}
        />

        <Button type="submit" disabled={!name || !value}>
          Create
        </Button>
      </Form>

      {error && (
        <div className="w-full flex items-center justify-center">
          <p className="text-sm max-w-md flex items-center gap-1.5 pl-[10px] pr-3 py-2 bg-error text-error-foreground font-medium rounded-sm">
            <Info size={16} className="shrink-0" />
            {error}
          </p>
        </div>
      )}
    </div>
  );
}

Secrets.loader = loader;
export default Secrets;
