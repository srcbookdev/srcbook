import { useState } from 'react';
import { getSecrets } from '@/lib/server';
import { Eye, KeyRound, EyeOff, Copy, Check } from 'lucide-react';
import { useLoaderData, Form, useRevalidator } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { updateSecret, createSecret, deleteSecret } from '@/lib/server';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

async function loader() {
  const { result } = await getSecrets();
  return { secrets: result };
}

async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  if (formData.get('new-form')) {
    const name = formData.get('name') as string;
    const value = formData.get('value') as string;
    const { result } = await createSecret({ name, value });
    if (!result) {
      console.error('Error creating secret');
    }
    return { secrets: result };
  }
  return null;
}

function Secrets() {
  const { secrets } = useLoaderData() as { secrets: Record<string, string> };

  return (
    <div>
      <h1 className="text-2xl my-4">Secrets</h1>
      <p>
        Secrets are a safe way utilize API tokens or other private credentials in Srcbooks. These
        are available in code cells via <code className="code">process.env.SECRET_NAME</code>.
      </p>
      {Object.keys(secrets).length > 0 && (
        <>
          <h2 className="text-xl mt-8 pb-4">Current Secrets</h2>

          <ul className="flex flex-col gap-2">
            {Object.entries(secrets)
              .sort(([nameA], [nameB]) => nameA.localeCompare(nameB))
              .map(([name, value]) => (
                <SecretRow name={name} value={value} key={name} />
              ))}
          </ul>
        </>
      )}

      <h2 className="text-xl mt-8 pb-4">Add a new Secret</h2>

      <NewSecretForm />
    </div>
  );
}

function SecretRow({ name, value }: { name: string; value: string }) {
  const revalidator = useRevalidator();
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [updatedName, setUpdatedName] = useState(name);
  const [updatedValue, setUpdatedValue] = useState(value);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');

  const handleUpdate = async () => {
    // name needs to follow the following pattern: "^[A-Z0-9_]+$"
    const namePattern = /^[A-Z0-9_]+$/;
    if (!namePattern.test(updatedName)) {
      setError('Invalid name: only letters, numbers and underscores are allowed');
      return;
    }

    // TODO handle errors
    await updateSecret({
      previousName: name,
      name: updatedName,
      value: updatedValue,
    });
    setMode('view');
    revalidator.revalidate();
  };

  const handleDelete = async () => {
    await deleteSecret({ name });
    revalidator.revalidate();
  };

  return (
    <>
      <li className="grid grid-cols-5 border rounded-lg p-1">
        {mode === 'view' ? (
          <>
            <div className="col-span-2 flex gap-3 items-center">
              <div className="p-1.5 border text-tertiary-foreground border-tertiary-foreground rounded-full">
                <KeyRound size={16} />
              </div>
              <code className="font-mono font-semibold text-sm">{name}</code>
            </div>
            <div className="col-span-2">
              <CopyableSecretValue value={value} />
            </div>

            <div className="col-span-1 flex justify-end items-center gap-2">
              <Button variant="secondary" onClick={() => setMode('edit')}>
                Edit
              </Button>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary">Remove</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete this secret</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete this secret?
                    </DialogDescription>
                    <div className="flex w-full justify-end items-center gap-2 pt-4 bg-background">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setOpen(false);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button variant="destructive" onClick={handleDelete}>
                        Delete
                      </Button>
                    </div>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            </div>
          </>
        ) : (
          <>
            <Input
              className="col-span-2 max-w-xs"
              type="text"
              value={updatedName}
              autoComplete="off"
              onChange={(e) => setUpdatedName(e.target.value.toUpperCase())}
            />
            <Input
              className="col-span-2 max-w-xs"
              type="text"
              name="value"
              autoComplete="off"
              value={updatedValue}
              onChange={(e) => setUpdatedValue(e.target.value)}
            />
            <div className="col-span-1 flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setMode('view')}>
                Cancel
              </Button>
              <Button className="col-span-1" type="submit" onClick={handleUpdate}>
                Update
              </Button>
            </div>
          </>
        )}
      </li>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </>
  );
}

function CopyableSecretValue({ value }: { value: string }) {
  const [state, setState] = useState<'hidden' | 'visible'>('hidden');
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };
  return (
    <>
      {state === 'hidden' ? (
        <div className="flex gap-2 items-center">
          <Button onClick={() => setState('visible')} variant="icon" size="icon">
            <Eye size={16} onClick={() => setState('visible')} />
          </Button>
          <p>•••••••••••</p>
          <Button variant="icon" size="icon" onClick={copy}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </Button>
          {copied && <p className="text-xs text-tertiary-foreground">Copied!</p>}
        </div>
      ) : (
        <div className="flex gap-2 items-center">
          <Button onClick={() => setState('hidden')} variant="icon" size="icon">
            <EyeOff size={16} />
          </Button>
          <p className="text-sm">
            {value.slice(0, 25)}
            {value.length > 25 ? '...' : ''}
          </p>
          <Button variant="icon" onClick={copy} size="icon">
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </Button>
          {copied && <p className="text-xs text-tertiary-foreground">Copied!</p>}
        </div>
      )}
    </>
  );
}

function NewSecretForm() {
  const [name, setName] = useState('');
  const [value, setValue] = useState('');

  return (
    <>
      <Form method="post" className="flex items-center gap-4">
        <Input
          type="text"
          name="name"
          value={name}
          pattern="^[A-Z0-9_]+$"
          autoComplete="off"
          onChange={(e) => setName(e.currentTarget.value.toUpperCase())}
          placeholder="name"
        />
        <Input
          type="text"
          name="value"
          value={value}
          autoComplete="off"
          onChange={(e) => setValue(e.currentTarget.value)}
          placeholder="value"
        />

        <Button type="submit" disabled={!name || !value}>
          Add secret
        </Button>
      </Form>
    </>
  );
}

Secrets.loader = loader;
Secrets.action = action;
export default Secrets;
