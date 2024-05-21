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
        Secrets are a safe way to share credentials and tokens with notebooks. You can think of
        these as environment variables, and access them with the usual{' '}
        <code className="px-1 py-0.5 border border-gray-200 rounded-sm">process.env</code>{' '}
      </p>
      {secrets && (
        <div>
          <h2 className="text-xl mt-8 pb-4">Current Secrets</h2>
          <ul className="flex flex-col gap-2">
            {Object.entries(secrets)
              .sort(([nameA], [nameB]) => nameA.localeCompare(nameB))
              .map(([name, value]) => (
                <SecretRow name={name} value={value} key={name} />
              ))}
          </ul>
        </div>
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
      <li className="grid grid-cols-5 border border-gray-200 rounded-lg p-3">
        {mode === 'view' ? (
          <>
            <div className="col-span-2 flex gap-3 items-center ">
              <div className="p-2 border border-gray-200 rounded-full">
                <KeyRound className="text-gray-500" size={16} />
              </div>
              <p className="font-semibold">{name}</p>
            </div>
            <div className="col-span-2">
              <CopyableSecretValue value={value} />
            </div>

            <div className="flex col-span-1 flex justify-end items-center gap-2">
              <Button variant="outline" onClick={() => setMode('edit')}>
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
                        variant="outline"
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
            <Input type="hidden" name="editing" value="something" className="hidden" />
            <Input
              className="col-span-2 max-w-xs"
              type="text"
              value={updatedName}
              onChange={(e) => setUpdatedName(e.target.value.toUpperCase())}
            />
            <Input
              className="col-span-2 max-w-xs"
              type="text"
              name="value"
              value={updatedValue}
              onChange={(e) => setUpdatedValue(e.target.value)}
            />
            <div className="col-span-1 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setMode('view')}>
                Cancel
              </Button>
              <Button className="col-span-1" type="submit" onClick={handleUpdate}>
                Update
              </Button>
            </div>
          </>
        )}
      </li>
      {error && <p className="text-red-500 text-sm">{error}</p>}
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
          <Button onClick={() => setState('visible')} variant="ghost">
            <Eye size={16} onClick={() => setState('visible')} />
          </Button>
          <p>•••••••••••</p>
          <Button variant="ghost" onClick={copy}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </Button>
          {copied && <p className="text-xs text-gray-500">Copied!</p>}
        </div>
      ) : (
        <div className="flex gap-2 items-center">
          <Button onClick={() => setState('hidden')} variant="ghost">
            <EyeOff size={16} />
          </Button>
          <p className="text-sm">
            {value.slice(0, 25)}
            {value.length > 25 ? '...' : ''}
          </p>
          <Button variant="ghost" onClick={copy}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </Button>
          {copied && <p className="text-xs text-gray-500">Copied!</p>}
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
        <Input type="hidden" name="new-form" value="something" className="hidden" />
        <Input
          type="text"
          name="name"
          value={name}
          pattern="^[A-Z0-9_]+$"
          onChange={(e) => setName(e.currentTarget.value.toUpperCase())}
          placeholder="name"
        />
        <Input
          type="text"
          name="value"
          value={value}
          onChange={(e) => setValue(e.currentTarget.value)}
          placeholder="value"
        />

        <Button type="submit" disabled={!name || !value}>
          Add secret
        </Button>
      </Form>
      <p className="text-xs text-gray-400 pl-4 pt-0.5">
        only letters, numbers and underscores are allowed
      </p>
    </>
  );
}

Secrets.loader = loader;
Secrets.action = action;
export default Secrets;
