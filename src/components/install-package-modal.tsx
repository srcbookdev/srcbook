import { useState, useEffect } from 'react';
import { searchNpmPackages } from '@/lib/server';
import { useDebounce } from 'use-debounce';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

type PackageMetadata = {
  name: string;
  version: string;
  description?: string;
};

export default function InstallPackageModal() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [value] = useDebounce(query, 500);
  const [results, setResults] = useState<PackageMetadata[]>([]);

  useEffect(() => {
    searchNpmPackages(value)
      .then((data) => setResults(data.result))
      .catch((e) => console.log('error:', e));
  }, [value]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>Open</DialogTrigger>
      <DialogContent className="w-[800px] h-[462px] flex flex-col">
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
                        <p className="text-sm text-gray-500 line-clamp-2">{result.description}</p>
                      </div>
                      <Button variant="outline" onClick={() => console.log('installing')}>
                        Add
                      </Button>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
