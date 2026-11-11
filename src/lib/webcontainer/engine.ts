import { WebContainer, FileSystemTree, DirectoryNode, FileNode as WcFileNode } from '@webcontainer/api';
import { FileNode } from '@/hooks/useWorkspaces';

let webcontainerInstance: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

/**
 * Boots the WebContainer instance. Returns a singleton.
 */
export async function bootWebContainer(): Promise<WebContainer> {
  if (webcontainerInstance) return webcontainerInstance;
  
  if (!bootPromise) {
    bootPromise = WebContainer.boot().then(instance => {
      webcontainerInstance = instance;
      return instance;
    });
  }
  
  return bootPromise;
}

/**
 * Converts our local FileNode structure to WebContainer's FileSystemTree
 */
function convertToFileSystemTree(nodes: FileNode[]): FileSystemTree {
  const tree: FileSystemTree = {};
  
  for (const node of nodes) {
    if (node.type === 'folder') {
      tree[node.name] = {
        directory: node.children ? convertToFileSystemTree(node.children) : {}
      } as DirectoryNode;
    } else if (node.type === 'file') {
      tree[node.name] = {
        file: {
          contents: node.content || ''
        }
      } as WcFileNode;
    }
  }
  
  return tree;
}

/**
 * Mounts a project into the WebContainer
 */
export async function mountProject(files: FileNode[]) {
  const instance = await bootWebContainer();
  const tree = convertToFileSystemTree(files);
  await instance.mount(tree);
}

/**
 * Runs a command in the WebContainer and streams output back via callback
 */
export async function runCommand(
  cmd: string, 
  args: string[], 
  onOutput: (data: string) => void,
  onExit?: (code: number) => void
) {
  const instance = await bootWebContainer();
  const process = await instance.spawn(cmd, args);
  
  process.output.pipeTo(
    new WritableStream({
      write(data) {
        onOutput(data);
      }
    })
  );
  
  if (onExit) {
    process.exit.then(onExit);
  }
  
  return process;
}
