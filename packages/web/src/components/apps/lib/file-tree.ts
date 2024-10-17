import type { DirEntryType, FileEntryType, FsEntryTreeType } from '@srcbook/shared';

/**
 * Sorts a file tree (in place) by name. Folders come first, then files.
 */
export function sortTree(tree: DirEntryType): DirEntryType {
  tree.children?.sort((a, b) => {
    if (a.type === 'directory') sortTree(a);
    if (b.type === 'directory') sortTree(b);
    if (a.type === 'directory' && b.type === 'file') return -1;
    if (a.type === 'file' && b.type === 'directory') return 1;
    return a.basename.localeCompare(b.basename);
  });

  return tree;
}

/**
 * Update a directory node in the file tree.
 *
 * This function is complex due to the merging of children. We do it to maintain
 * nested state of a given tree. Consider the following file tree that the user
 * has open in their file tree viewer:
 *
 *     /src
 *     │
 *     ├── components
 *     │   ├── ui
 *     │   │   └── table
 *     │   │       ├── index.tsx
 *     │   │       └── show.tsx
 *     │   │
 *     │   └── use-files.tsx
 *     │
 *     └── index.tsx
 *
 * If the user closes and then reopens the "components" folder, the reopening of
 * the "components" folder will make a call to load its children. However, calls
 * to load children only load the immediate children, not all nested children.
 * This means that the call will not load the "ui" folder's children.
 *
 * Now, given that the user had previously opened the "ui" folder and we have the
 * results of that folder loaded in our state, we don't want to throw away those
 * values. So we merge the children of the new node and any nested children of
 * the old node.
 *
 * This supports behavior where a user may open many nested folders and then close
 * and later reopen a ancestor folder. We want the tree to look the same when the
 * reopen occurs with only the immediate children updated.
 */
export function updateDirNode(tree: DirEntryType, node: DirEntryType): DirEntryType {
  return sortTree(doUpdateDirNode(tree, node));
}

function doUpdateDirNode(tree: DirEntryType, node: DirEntryType): DirEntryType {
  if (tree.path === node.path) {
    if (node.children === null) {
      return { ...node, children: tree.children };
    } else {
      return { ...node, children: merge(tree.children, node.children) };
    }
  }

  if (tree.children) {
    return {
      ...tree,
      children: tree.children.map((entry) => {
        if (entry.type === 'directory') {
          return doUpdateDirNode(entry, node);
        } else {
          return entry;
        }
      }),
    };
  }

  return tree;
}

function merge(oldChildren: FsEntryTreeType | null, newChildren: FsEntryTreeType): FsEntryTreeType {
  if (!oldChildren) {
    return newChildren;
  }

  return newChildren.map((newChild) => {
    const oldChild = oldChildren.find((old) => old.path === newChild.path);

    if (oldChild && oldChild.type === 'directory' && newChild.type === 'directory') {
      return {
        ...newChild,
        children:
          newChild.children === null
            ? oldChild.children
            : merge(oldChild.children, newChild.children),
      };
    }

    return newChild;
  });
}

export function renameDirNode(
  tree: DirEntryType,
  oldNode: DirEntryType,
  newNode: DirEntryType,
): DirEntryType {
  return sortTree(doRenameDirNode(tree, oldNode, newNode));
}

function doRenameDirNode(
  tree: DirEntryType,
  oldNode: DirEntryType,
  newNode: DirEntryType,
): DirEntryType {
  const children =
    tree.children === null
      ? null
      : tree.children.map((entry) => {
          if (entry.type === 'directory') {
            return doRenameDirNode(entry, oldNode, newNode);
          } else {
            if (entry.path.startsWith(oldNode.path)) {
              return { ...entry, path: entry.path.replace(oldNode.path, newNode.path) };
            } else {
              return entry;
            }
          }
        });

  if (tree.path === oldNode.path) {
    return { ...newNode, children };
  } else if (tree.path.startsWith(oldNode.path)) {
    const path = tree.path.replace(oldNode.path, newNode.path);
    return { ...tree, path, children };
  } else {
    return { ...tree, children };
  }
}

export function updateFileNode(
  tree: DirEntryType,
  oldNode: FileEntryType,
  newNode: FileEntryType,
): DirEntryType {
  return sortTree(doUpdateFileNode(tree, oldNode, newNode));
}

function doUpdateFileNode(
  tree: DirEntryType,
  oldNode: FileEntryType,
  newNode: FileEntryType,
): DirEntryType {
  if (tree.children === null) {
    return tree;
  }

  const children = [];

  for (const entry of tree.children) {
    if (entry.path === oldNode.path) {
      children.push(newNode);
    } else {
      if (entry.type === 'directory') {
        children.push(doUpdateFileNode(entry, oldNode, newNode));
      } else {
        children.push(entry);
      }
    }
  }

  return { ...tree, children };
}

/**
 * Delete a node from the file tree.
 *
 * This doesn't affect sort order, so no need to call sortTree.
 */
export function deleteNode(tree: DirEntryType, path: string): DirEntryType {
  if (tree.children === null) {
    return tree;
  }

  const children: FsEntryTreeType = [];

  for (const entry of tree.children) {
    if (entry.path === path) {
      continue;
    }

    if (entry.type === 'directory') {
      children.push(deleteNode(entry, path));
    } else {
      children.push(entry);
    }
  }

  return { ...tree, children };
}

/**
 * Create a new node in the file tree.
 */
export function createNode(tree: DirEntryType, node: DirEntryType | FileEntryType): DirEntryType {
  return sortTree(doCreateNode(tree, node));
}

function doCreateNode(tree: DirEntryType, node: DirEntryType | FileEntryType): DirEntryType {
  if (tree.children === null) {
    return tree;
  }

  // To avoid duplicate entries in the tree, ensure that we 'upsert' here.
  if (tree.path === node.dirname) {
    const idx = tree.children.findIndex((entry) => entry.path === node.path);
    const children = [...tree.children];

    if (idx === -1) {
      children.push(node);
    } else {
      children.splice(idx, 1, node);
    }

    return { ...tree, children };
  }

  const children = tree.children.map((entry) => {
    if (entry.type === 'directory') {
      return doCreateNode(entry, node);
    } else {
      return entry;
    }
  });

  return { ...tree, children };
}
