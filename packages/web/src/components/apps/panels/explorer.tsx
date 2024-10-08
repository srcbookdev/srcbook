import { Folder } from 'lucide-react';
import { useFiles, type FileTreeType } from '../use-files';
import { FileType } from '@srcbook/shared';

export default function ExplorerPanel() {
  const { fileTree, openedFile, setOpenedFile } = useFiles();

  return (
    <div className="w-56 py-4">
      <FileTree tree={fileTree} openedFile={openedFile} setOpenedFile={setOpenedFile} />
    </div>
  );
}

type FileTreePropsType = {
  tree: FileTreeType;
  openedFile: FileType | null;
  setOpenedFile: (file: FileType) => void;
};

function FileTree({ tree, openedFile, setOpenedFile }: FileTreePropsType) {
  return (
    <ul className="pl-4 font-mono text-xs text-tertiary-foreground leading-6">
      {tree.map((entry) =>
        entry.directory ? (
          <li key={entry.name}>
            <div className="flex items-center gap-1.5">
              <Folder size={12} /> {entry.name}
            </div>
            <FileTree tree={entry.children} openedFile={openedFile} setOpenedFile={setOpenedFile} />
          </li>
        ) : (
          <li
            key={entry.name}
            className={
              openedFile?.path === entry.file.path
                ? 'cursor-default text-foreground font-semibold'
                : 'cursor-pointer hover:text-foreground hover:font-semibold'
            }
          >
            <button onClick={() => setOpenedFile(entry.file)}>{entry.name}</button>
          </li>
        ),
      )}
    </ul>
  );
}
