import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { installNpmPackage, searchNpmPackages } from '@/lib/server';
import { useDebounce } from 'use-debounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import type { SessionType } from '@/types';

type PackageMetadata = {
  name: string;
  version: string;
  description?: string;
};

export default function InstallPackageModal({
  session,
  children,
}: {
  session: SessionType;
  children: React.ReactNode;
}) {
  const [mode, setMode] = useState<'search' | 'loading' | 'success' | 'error'>('search');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PackageMetadata[]>([]);
  const [pkg, setPkg] = useState('');
  const [log, setLog] = useState('');

  const [value] = useDebounce(query, 300);

  useEffect(() => {
    searchNpmPackages(value)
      .then((data) => setResults(data.result))
      .catch((e) => console.error('error:', e));
  }, [value]);

  const addPackage = (packageName: string) => {
    setPkg(packageName);
    setMode('loading');
    installNpmPackage(session.id, { packageName })
      .then((data) => {
        setMode('success');
        setLog(data.result);
      })
      .catch((e) => {
        setMode('error');
        console.error('error installing package:\n', e);
      });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        setOpen(newOpen);
        if (newOpen) {
          setMode('search');
        }
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        className={cn(
          'flex flex-col transition-height',
          mode === 'search' ? 'w-[800px] h-[462px]' : '',
        )}
      >
        {mode === 'error' && (
          <>
            <div className="flex flex-col w-full h-full items-center justify-center gap-3">
              <DialogTitle className="text-red-400">Something went wrong</DialogTitle>
              <p>Failed to install {pkg}, please try again.</p>
            </div>
          </>
        )}
        {mode === 'loading' && (
          <div className="flex w-full h-full items-center justify-center gap-3">
            <Loader2 className="animate-spin" />
            <p>Installing {pkg}</p>
          </div>
        )}
        {mode === 'success' && (
          <>
            <DialogHeader>
              <DialogTitle>Successfully added {pkg}</DialogTitle>
            </DialogHeader>
            <p className="font-mono text-sm whitespace-pre-line">{log}</p>
          </>
        )}
        {mode === 'search' && (
          <>
            <DialogHeader>
              <DialogTitle>Add npm package</DialogTitle>
              <DialogDescription>Search for a package and add to your project.</DialogDescription>
            </DialogHeader>
            <Input
              placeholder="Search for a package"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Command>
              <CommandList className="h-full overflow-scroll">
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup>
                  {results.map((result) => {
                    return (
                      <CommandItem key={result.name} value={result.name}>
                        <div className="flex justify-between w-full items-center gap-6">
                          <div className="flex flex-col">
                            <div className="flex gap-1">
                              <p className="font-bold">{result.name}</p>
                              <p className="text-sm text-gray-500">{result.version}</p>
                            </div>
                            <p className="text-sm text-gray-500 line-clamp-2">
                              {result.description}
                            </p>
                          </div>
                          <Button variant="outline" onClick={() => addPackage(result.name)}>
                            Add
                          </Button>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
