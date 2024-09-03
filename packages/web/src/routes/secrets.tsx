import { useRef, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { Info, Trash2, Eye, EyeOff } from 'lucide-react';
import { Form, useLoaderData, useRevalidator } from 'react-router-dom';
import { cn } from '@/lib/utils.ts';
import { getSecrets, updateSecret, createSecret, deleteSecret } from '@/lib/server';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

async function loader() {
  const { result } = await getSecrets();
  return { secrets: result };
}

function isValidSecretName(name: string): boolean {
  return /^[A-Z0-9_]+$/.test(name);
}

function Secrets(): JSX.Element {
  const { secrets } = useLoaderData() as { secrets: Record<string, string> };

  const [error, setError] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- hmmm
  const timeoutRef = useRef<any>(null);

  function errorSetter(message: string | null, clearAfter: number | null = null) {
    if (message === null) {
      setError(null);
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setError(message);

    if (clearAfter) {
      timeoutRef.current = setTimeout(() => {
        setError(null);
      }, clearAfter);
    }
  }

  return (
    <>
      <h4 className="h4 mx-auto mb-6">Secrets</h4>

      <p>
        Secrets are a safe way utilize API tokens or other private credentials in Srcbooks. These
        are available in code cells via <code className="code">process.env.SECRET_NAME</code>.
      </p>

      <div className="mt-12 space-y-6">
        <NewSecretForm setError={errorSetter} />
        {error ? <ErrorMessage message={error} /> : null}
        <SecretsTable secrets={secrets} setError={errorSetter} />
      </div>
    </>
  );
}

function ErrorMessage(props: { message: string }): JSX.Element {
  return (
    <div className="w-full flex items-center justify-center">
      <p className="text-sm max-w-md flex items-center gap-1.5 pl-[10px] pr-3 py-2 bg-error text-error-foreground font-medium rounded-sm">
        <Info className="shrink-0" size={16} />
        {props.message}
      </p>
    </div>
  );
}

function SecretsTable(props: {
  secrets: Record<string, string>;
  setError: (message: string | null, clearAfter?: number | null) => void;
}): JSX.Element | false {
  const revalidator = useRevalidator();

  async function onUpdate(name: string, updatedName: string, updatedValue: string): Promise<void> {
    // TODO handle errors
    await updateSecret({
      previousName: name,
      name: updatedName,
      value: updatedValue,
    });

    revalidator.revalidate();
  }

  async function onDelete(name: string): Promise<void> {
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
              <th className="h-10 pl-3 text-right align-middle w-[52px]" />
            </tr>
          </thead>
          <tbody>
            {sortedSecrets.map(([name, value]) => (
              <SecretRow
                key={name}
                name={name}
                onDelete={() => {
                  void (async () => {
                    await onDelete(name);
                  })();
                }}
                onUpdate={(newName) => {
                  void (async () => {
                    await onUpdate(name, newName, value);
                  })();
                }}
                setError={props.setError}
                value={value}
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
  setError: (message: string | null, clearAfter?: number | null) => void;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(props.name);
  const [value, setValue] = useState(props.value);

  const nameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const [hovering, setHovering] = useState(false);
  const [show, setShow] = useState(false);

  function onNameKeydown(e: React.KeyboardEvent<HTMLInputElement>): void {
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

  function onPasswordKeydown(e: React.KeyboardEvent<HTMLInputElement>): void {
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

  function onBlur(): void {
    if (isValidSecretName(name)) {
      props.onUpdate(props.name, name, value);
    } else {
      props.setError(
        'Secret names must be uppercase and can only contain letters, numbers, and underscores.',
        5000,
      );
      setName(props.name);
    }
  }

  return (
    <tr
      className="transition-all group"
      onMouseEnter={() => {
        setHovering(true);
      }}
      onMouseLeave={() => {
        setHovering(false);
      }}
    >
      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete <code className="code">{name}</code>
            </DialogTitle>
            <DialogDescription>Are you sure you want to delete this secret?</DialogDescription>
            <div className="flex w-full justify-end items-center gap-2 pt-4 bg-background">
              <Button
                onClick={() => {
                  setOpen(false);
                }}
                variant="secondary"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  props.onDelete(name);
                }}
                variant="destructive"
              >
                Delete
              </Button>
            </div>
          </DialogHeader>
        </DialogContent>
      </Dialog>
      <td className="h-10 pr-3 text-left align-middle lg:w-[434px]">
        <Input
          autoComplete="off"
          className="border-transparent group-hover:border-border group-focus-within:border-border"
          onBlur={onBlur}
          onChange={(e) => {
            setName(e.currentTarget.value.toUpperCase());
          }}
          onKeyDown={onNameKeydown}
          ref={nameRef}
          value={name}
        />
      </td>
      <td className="h-10 text-left align-middle relative">
        <Input
          autoComplete="off"
          className="border-transparent group-hover:border-border group-focus-within:border-border pr-8"
          onBlur={onBlur}
          onChange={(e) => {
            setValue(e.currentTarget.value);
          }}
          onKeyDown={onPasswordKeydown}
          ref={passwordRef}
          required
          type={show ? 'text' : 'password'}
          value={value}
        />
        {show ? (
          <EyeOff
            className={cn(
              'absolute right-3 top-3 cursor-pointer opacity-80 bg-background',
              !hovering && 'hidden',
            )}
            onClick={() => {
              setShow(false);
            }}
            size={14}
          />
        ) : (
          <Eye
            className={cn(
              'absolute right-3 top-3 cursor-pointer opacity-80 bg-background',
              !hovering && 'hidden',
            )}
            onClick={() => {
              setShow(true);
            }}
            size={14}
          />
        )}
      </td>
      <td className="h-10 pl-3 text-right align-middle w-[52px]">
        <Button
          onClick={() => {
            setOpen(true);
          }}
          variant="icon"
        >
          <Trash2 size={18} />
        </Button>
      </td>
    </tr>
  );
}

function NewSecretForm(props: {
  setError: (message: string | null, clearAfter?: number | null) => void;
}): JSX.Element {
  useHotkeys(
    'mod+enter',
    () => {
      void (async () => {
        await onSubmit();
      })();
    },
    { enableOnFormTags: ['input'] },
  );

  const revalidator = useRevalidator();

  const [name, setName] = useState('');
  const [value, setValue] = useState('');

  async function onSubmit(e?: React.FormEvent<HTMLFormElement>): Promise<void> {
    if (e) {
      e.preventDefault();
    }

    if (!isValidSecretName(name)) {
      props.setError(
        'Secret names must be uppercase and can only contain letters, numbers, and underscores.',
        5000,
      );
      return;
    }

    await createSecret({ name, value });
    setName('');
    setValue('');
    revalidator.revalidate();
  }

  return (
    <Form className="flex items-center gap-3" method="post" onSubmit={onSubmit}>
      <Input
        autoComplete="off"
        name="name"
        onChange={(e) => {
          setName(e.currentTarget.value.toUpperCase());
        }}
        placeholder="SECRET_NAME"
        required
        type="text"
        value={name}
      />

      <Input
        autoComplete="off"
        name="value"
        onChange={(e) => {
          setValue(e.currentTarget.value);
        }}
        placeholder="secret-value"
        required
        type="text"
        value={value}
      />

      <Button disabled={!name || !value} type="submit">
        Create
      </Button>
    </Form>
  );
}

Secrets.loader = loader;
export default Secrets;
