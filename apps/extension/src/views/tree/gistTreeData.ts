import * as vscode from 'vscode';
import type { StorageEntry } from '@gisthub/core';
import type { StorageServiceManager } from '../../services/storageManager';
import {
  EmptyNode,
  ErrorNode,
  GistFileNode,
  GistFolderNode,
  type GistTreeItem,
} from './treeItem';

export class GistTreeProvider implements vscode.TreeDataProvider<GistTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<
    GistTreeItem | undefined | null | void
  >();

  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private readonly gistManager: StorageServiceManager) {}

  dispose(): void {
    this._onDidChangeTreeData.dispose();
  }

  getTreeItem(element: GistTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: GistTreeItem): Promise<GistTreeItem[]> {
    try {
      if (!element) {
        return await this.getRootItems();
      }

      if (element instanceof GistFolderNode) {
        return await this.getChildrenForFolder(element);
      }

      return [];
    } catch (error) {
      return [new ErrorNode(vscode.l10n.t('errorFetchingGists'))];
    }
  }

  private async getRootItems(): Promise<GistTreeItem[]> {
    const providers = this.gistManager.getAllServices();

    if (providers.length === 0) {
      return [new EmptyNode(vscode.l10n.t('noActiveProviders'))];
    }

    const results = await Promise.all(
      providers.map(async ([providerId, service]) => {
        try {
          const entries = await service.list('');
          return this.mapEntries(entries, providerId);
        } catch (error) {
          console.error(`Error fetching entries from ${providerId}:`, error);
          return [];
        }
      }),
    );

    const items = results.flat();
    return items.length > 0
      ? items
      : [new EmptyNode(vscode.l10n.t('noActiveProviders'))];
  }

  private async getChildrenForFolder(
    element: GistFolderNode,
  ): Promise<GistTreeItem[]> {
    const service = this.gistManager.getService(element.providerId);
    if (!service) return [];

    const entries = await service.list(element.entry.path);
    return this.mapEntries(entries, element.providerId);
  }

  private mapEntries(
    entries: StorageEntry[],
    providerId: string,
  ): GistTreeItem[] {
    return entries.map((entry) =>
      entry.type === 'folder'
        ? new GistFolderNode(entry, providerId)
        : new GistFileNode(entry, providerId),
    );
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }
}
