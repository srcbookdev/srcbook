import { DirEntryType, FileEntryType } from '@srcbook/shared';

const ROOT_PATH = '.';

class DirectoryNode implements DirEntryType {
  path: string;
  dirname: string;
  basename: string;
  children: Array<FileEntryType | DirectoryNode> | null = null;

  get type() {
    return 'directory' as const;
  }

  static fromEntry(entry: DirEntryType): DirectoryNode {
    return new DirectoryNode({
      path: entry.path,
      dirname: entry.dirname,
      basename: entry.basename,
      children:
        entry.children === null
          ? null
          : entry.children.map((entry) => {
              return entry.type === 'file' ? entry : DirectoryNode.fromEntry(entry);
            }),
    });
  }

  constructor(attributes: {
    path: string;
    dirname: string;
    basename: string;
    children: Array<FileEntryType | DirectoryNode> | null;
  }) {
    this.path = attributes.path;
    this.dirname = attributes.dirname;
    this.basename = attributes.basename;
    this.children = attributes.children;
    this.sortChildren();
  }

  isParentOf(node: { dirname: string }) {
    return node.dirname === this.path;
  }

  isAncestorOf(node: { path: string }) {
    return this.path === ROOT_PATH || node.path.startsWith(this.path + '/');
  }

  private sortChildren() {
    this.children?.sort((a, b) => {
      if (a.type === 'directory' && b.type === 'file') return -1;
      if (b.type === 'directory' && a.type === 'file') return 1;
      return a.basename.localeCompare(b.basename);
    });
  }
}

/**
 * File tree is an immutable tree representing the directories and files
 * of a given directory (the root node), represented by the path '.'.
 */
export class FileTree {
  private root: DirectoryNode;

  static fromEntry(entry: DirEntryType) {
    return new FileTree(DirectoryNode.fromEntry(entry));
  }

  constructor(root: DirectoryNode) {
    this.root = root;
  }

  find(path: string) {
    return this.findNode(this.root, path);
  }

  private findNode(dirNode: DirectoryNode, path: string): FileEntryType | DirEntryType | null {
    if (dirNode.path === path) {
      return dirNode;
    }

    for (const child of dirNode.children ?? []) {
      if (child.type === 'file' && child.path === path) {
        return child;
      }

      if (child.type === 'directory' && dirNode.isAncestorOf({ path })) {
        return this.findNode(child, path);
      }
    }

    return null;
  }

  insert(entry: FileEntryType | DirEntryType): FileTree {
    const root = this.insertNode(
      this.root,
      entry.type === 'file' ? entry : DirectoryNode.fromEntry(entry),
    );

    return new FileTree(root);
  }

  private insertNode(dirNode: DirectoryNode, node: FileEntryType | DirectoryNode) {
    if (!dirNode.isAncestorOf(node)) {
      // Structural sharing / traversal optimization
      return dirNode;
    }

    if (dirNode.isParentOf(node)) {
      // If this is an updated node of one that exists inside the directory,
      // make sure to replace it so that we do not have duplicate copies.
      const children = (dirNode.children ?? []).filter((n) => n.path !== node.path);
      children.push(node);
      return new DirectoryNode({ ...dirNode, children });
    }

    // If the node to insert lives more than one level below this node but this node
    // has not loaded its children, raise an error (we don't expect this to happen).
    if (dirNode.children === null) {
      throw new Error('Cannot insert node into a tree that has not loaded its children');
    }

    const children = dirNode.children.map((n): FileEntryType | DirectoryNode => {
      // We know the node is not a child of dirNode here since we checked for that above.
      return n.type === 'file' ? n : this.insertNode(n, node);
    });

    return new DirectoryNode({ ...dirNode, children });
  }

  remove(entry: FileEntryType | DirEntryType) {
    return this.removeNode(this.root, entry);
  }

  private removeNode(dirNode: DirectoryNode, node: FileEntryType | DirEntryType) {
    if (!dirNode.isAncestorOf(node)) {
      // Structural sharing / traversal optimization
      return dirNode;
    }

    if (dirNode.isParentOf(node)) {
      const children = (dirNode.children ?? []).filter((n) => n.path !== node.path);
      return new DirectoryNode({ ...dirNode, children });
    }

    const children = (dirNode.children ?? []).map((n): FileEntryType | DirectoryNode => {
      // We know the node is not a child of dirNode here since we checked for that above.
      return n.type === 'file' ? n : this.removeNode(n, node);
    });

    return new DirectoryNode({ ...dirNode, children });
  }
}
