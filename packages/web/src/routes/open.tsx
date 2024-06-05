import { useLoaderData, redirect } from 'react-router-dom';
import { disk, createSession } from '@/lib/server';
import FilePicker, { DirPicker } from '@/components/file-picker';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import type { FsObjectResultType } from '@/types';

async function loader() {
  const { result } = await disk();
  return result;
}

async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  const dirname = formData.get('dirname') as string;
  const basename = formData.get('basename') as string;
  const { result } = await createSession({ dirname, title: basename });
  return redirect(`/sessions/${result.id}`);
}

function Open() {
  const { dirname, entries: initialEntries } = useLoaderData() as FsObjectResultType;

  return (
    <>
      <h1 className="text-2xl">Open a Srcbook</h1>
      <Tabs defaultValue="file" className="">
        <div className="flex w-full justify-center">
          <TabsList className="">
            <TabsTrigger value="file">open a .srcmd file</TabsTrigger>
            <TabsTrigger value="directory">open a directory</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="file">
          <p className="text-center py-2">Select a .srcmd file to open as a new notebook.</p>
          <FilePicker dirname={dirname} entries={initialEntries} cta="Open" />
        </TabsContent>
        <TabsContent value="directory">
          <p className="text-center py-2">Open a Srcbook directory</p>
          <DirPicker dirname={dirname} entries={initialEntries} cta="Open" />
        </TabsContent>
      </Tabs>
    </>
  );
}

Open.loader = loader;
Open.action = action;
export default Open;
