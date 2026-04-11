import * as vscode from 'vscode';
import type { StorageServiceManager } from './services/storageManager';
import { parseUri } from './utils';

export class GistFileSystemProvider implements vscode.FileSystemProvider {
  private readonly eventEmitter = new vscode.EventEmitter<
    vscode.FileChangeEvent[]
  >();
  private readonly manager: StorageServiceManager;

  public readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> =
    this.eventEmitter.event;

  constructor(provider: StorageServiceManager) {
    this.manager = provider;
  }

  watch(
    _uri: vscode.Uri,
    _options: {
      readonly recursive: boolean;
      readonly excludes: readonly string[];
    },
  ): vscode.Disposable {
    return {
      dispose: () => {},
    };
  }

  stat(_uri: vscode.Uri): vscode.FileStat | Thenable<vscode.FileStat> {
    return {
      type: vscode.FileType.File,
      ctime: 0,
      mtime: Date.now(),
      size: 0,
    };
  }

  readDirectory(
    _uri: vscode.Uri,
  ): [string, vscode.FileType][] | Thenable<[string, vscode.FileType][]> {
    return [];
  }

  createDirectory(_uri: vscode.Uri): void | Thenable<void> {}

  async readFile(uri: vscode.Uri): Promise<Uint8Array> {
    try {
      const { storagePath, providerId } = parseUri(uri);
      const provider = this.manager.getService(providerId);

      if (!provider) {
        throw vscode.FileSystemError.FileNotFound(uri);
      }

      const content = await provider.readContent(storagePath);

      return new TextEncoder().encode(content.content || '');
    } catch (e) {
      if (e instanceof vscode.FileSystemError) {
        throw e;
      }
      throw vscode.FileSystemError.FileNotFound(uri);
    }
  }

  async writeFile(
    uri: vscode.Uri,
    content: Uint8Array,
    options: { readonly create: boolean; readonly overwrite: boolean },
  ): Promise<void> {
    const { storagePath, providerId } = parseUri(uri);
    const provider = this.manager.getService(providerId);
    const contentStr = new TextDecoder().decode(content);

    if (!provider) {
      throw vscode.FileSystemError.FileNotFound(uri);
    }

    if (options.create && !options.overwrite) {
      await provider.createEntry({
        path: storagePath,
        name: storagePath.split('/').pop() || storagePath,
        type: 'file',
        metadata: { content: contentStr },
      });
      return;
    }

    await provider.writeContent(storagePath, contentStr);
    this.notifyFileChanged(uri, vscode.FileChangeType.Changed);
  }

  async delete(
    uri: vscode.Uri,
    _options: { readonly recursive: boolean },
  ): Promise<void> {
    const { storagePath, providerId } = parseUri(uri);

    const provider = this.manager.getService(providerId);

    if (!provider) {
      throw vscode.FileSystemError.FileNotFound(uri);
    }

    await provider.deleteEntry(storagePath);

    this.notifyFileChanged(uri, vscode.FileChangeType.Deleted);
  }

  async rename(
    oldUri: vscode.Uri,
    newUri: vscode.Uri,
    _options: { readonly overwrite: boolean },
  ): Promise<void> {
    const { storagePath: oldPath, providerId } = parseUri(oldUri);
    const provider = this.manager.getService(providerId);

    if (!provider) {
      throw vscode.FileSystemError.FileNotFound(oldUri);
    }

    const { storagePath: newPath } = parseUri(newUri);

    const content = await provider.readContent(oldPath);

    await provider.createEntry({
      path: newPath,
      name: newPath.split('/').pop() || newPath,
      type: 'file',
      metadata: { content: content.content },
    });

    await provider.deleteEntry(oldPath);

    this.notifyFileChanged(oldUri, vscode.FileChangeType.Deleted);
    this.notifyFileChanged(newUri, vscode.FileChangeType.Created);
  }

  async copy(
    source: vscode.Uri,
    destination: vscode.Uri,
    _options: { readonly overwrite: boolean },
  ): Promise<void> {
    const { storagePath: sourcePath, providerId } = parseUri(source);
    const provider = this.manager.getService(providerId);

    if (!provider) {
      throw vscode.FileSystemError.FileNotFound(source);
    }

    const { storagePath: destPath } = parseUri(destination);

    const content = await provider.readContent(sourcePath);

    await provider.createEntry({
      path: destPath,
      name: destPath.split('/').pop() || destPath,
      type: 'file',
      metadata: { content: content.content },
    });

    this.notifyFileChanged(destination, vscode.FileChangeType.Created);
  }

  private notifyFileChanged(
    uri: vscode.Uri,
    type: vscode.FileChangeType,
  ): void {
    this.eventEmitter.fire([{ uri, type }]);
  }
}
