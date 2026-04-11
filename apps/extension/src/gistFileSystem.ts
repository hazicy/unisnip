import * as vscode from 'vscode';
import type { StorageEntry, StorageService } from '@gisthub/core';
import type { StorageServiceManager } from './services/storageManager';
import { parseUri } from './utils';

export class GistFileSystemProvider implements vscode.FileSystemProvider {
  private readonly changeEmitter = new vscode.EventEmitter<
    vscode.FileChangeEvent[]
  >();
  private readonly manager: StorageServiceManager;

  public readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> =
    this.changeEmitter.event;

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
    return new vscode.Disposable(() => undefined);
  }

  async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
    const { service, storagePath } = this.resolveTarget(uri);

    try {
      const entry = await service.getEntry(storagePath);
      return this.toFileStat(entry);
    } catch (error) {
      throw vscode.FileSystemError.FileNotFound(uri);
    }
  }

  async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
    const { service, storagePath } = this.resolveTarget(uri);

    try {
      const entries = await service.list(storagePath);
      return entries
        .filter((entry) => entry.path !== storagePath)
        .map((entry) => [
          entry.name || entry.path.split('/').pop() || entry.path,
          this.toFileType(entry.type),
        ]);
    } catch (error) {
      throw vscode.FileSystemError.FileNotFound(uri);
    }
  }

  async createDirectory(uri: vscode.Uri): Promise<void> {
    const { service, storagePath } = this.resolveTarget(uri);

    await service.createEntry({
      path: storagePath,
      name: storagePath.split('/').pop() || storagePath,
      type: 'folder',
    });

    this.notifyFileChanged(uri, vscode.FileChangeType.Created);
  }

  async readFile(uri: vscode.Uri): Promise<Uint8Array> {
    const { service, storagePath } = this.resolveTarget(uri);

    try {
      const content = await service.readContent(storagePath);

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
    const { service, storagePath } = this.resolveTarget(uri);
    const contentStr = new TextDecoder().decode(content);
    const existingEntry = await this.safeGetEntry(service, storagePath);

    if (existingEntry) {
      if (!options.overwrite) {
        throw vscode.FileSystemError.FileExists(uri);
      }

      await service.writeContent(storagePath, contentStr);
      this.notifyFileChanged(uri, vscode.FileChangeType.Changed);
      return;
    }

    if (!options.create) {
      throw vscode.FileSystemError.FileNotFound(uri);
    }

    await service.createEntry({
      path: storagePath,
      name: storagePath.split('/').pop() || storagePath,
      type: 'file',
      metadata: { content: contentStr },
    });
    this.notifyFileChanged(uri, vscode.FileChangeType.Created);
  }

  async delete(
    uri: vscode.Uri,
    _options: { readonly recursive: boolean },
  ): Promise<void> {
    const { service, storagePath } = this.resolveTarget(uri);
    await service.deleteEntry(storagePath);

    this.notifyFileChanged(uri, vscode.FileChangeType.Deleted);
  }

  async rename(
    oldUri: vscode.Uri,
    newUri: vscode.Uri,
    _options: { readonly overwrite: boolean },
  ): Promise<void> {
    const { storagePath: oldPath, providerId } = parseUri(oldUri);
    const { storagePath: newPath, providerId: newProviderId } = parseUri(newUri);

    if (providerId !== newProviderId) {
      throw vscode.FileSystemError.NoPermissions(
        'Cannot rename across providers',
      );
    }

    const service = this.manager.getService(providerId);
    if (!service) {
      throw vscode.FileSystemError.FileNotFound(oldUri);
    }

    const content = await service.readContent(oldPath);

    await service.createEntry({
      path: newPath,
      name: newPath.split('/').pop() || newPath,
      type: 'file',
      metadata: { content: content.content },
    });

    await service.deleteEntry(oldPath);

    this.notifyFileChanged(oldUri, vscode.FileChangeType.Deleted);
    this.notifyFileChanged(newUri, vscode.FileChangeType.Created);
  }

  async copy(
    source: vscode.Uri,
    destination: vscode.Uri,
    _options: { readonly overwrite: boolean },
  ): Promise<void> {
    const { storagePath: sourcePath, providerId } = parseUri(source);
    const { storagePath: destPath, providerId: destProviderId } =
      parseUri(destination);

    if (providerId !== destProviderId) {
      throw vscode.FileSystemError.NoPermissions('Cannot copy across providers');
    }

    const service = this.manager.getService(providerId);
    if (!service) {
      throw vscode.FileSystemError.FileNotFound(source);
    }

    const content = await service.readContent(sourcePath);

    await service.createEntry({
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
    this.changeEmitter.fire([{ uri, type }]);
  }

  private resolveTarget(uri: vscode.Uri): {
    service: StorageService;
    providerId: string;
    storagePath: string;
  } {
    const { storagePath, providerId } = parseUri(uri);
    const service = this.manager.getService(providerId);

    if (!service) {
      throw vscode.FileSystemError.FileNotFound(uri);
    }

    return { service, providerId, storagePath };
  }

  private async safeGetEntry(
    service: StorageService,
    path: string,
  ): Promise<StorageEntry | null> {
    try {
      return await service.getEntry(path);
    } catch {
      return null;
    }
  }

  private toFileType(type: StorageEntry['type']): vscode.FileType {
    return type === 'folder' ? vscode.FileType.Directory : vscode.FileType.File;
  }

  private toFileStat(entry: StorageEntry): vscode.FileStat {
    return {
      type: this.toFileType(entry.type),
      ctime: entry.createdAt ? new Date(entry.createdAt).getTime() : 0,
      mtime: entry.updatedAt ? new Date(entry.updatedAt).getTime() : Date.now(),
      size: entry.size ?? 0,
    };
  }
}
