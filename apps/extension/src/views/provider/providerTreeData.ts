import * as vscode from 'vscode';
import { StorageType } from '@gisthub/core';
import type { ProviderConfig } from '../../types';
import type { StorageServiceManager } from '../../services/storageManager';

function getProviderIcon(type: StorageType): vscode.ThemeIcon {
  if (type === StorageType.GitHub) return new vscode.ThemeIcon('mark-github');
  if (type === StorageType.S3) return new vscode.ThemeIcon('database');
  if (type === StorageType.WebDAV) {
    return new vscode.ThemeIcon('server-environment');
  }

  return new vscode.ThemeIcon('plug');
}

function getProviderDescription(config: ProviderConfig): string {
  if (config.type === StorageType.GitHub) return 'GitHub Gist';

  if (config.type === StorageType.S3) {
    return `S3 ${config.bucket ? `(${config.bucket})` : ''}`.trim();
  }

  if (config.type === StorageType.WebDAV) {
    return `WebDAV ${config.endpoint ? `(${config.endpoint})` : ''}`.trim();
  }

  return config.type;
}

export class ProviderNode extends vscode.TreeItem {
  constructor(public readonly config: ProviderConfig) {
    super(config.id, vscode.TreeItemCollapsibleState.None);

    this.id = `provider:${config.id}`;
    this.iconPath = getProviderIcon(config.type);
    this.description = getProviderDescription(config);
    this.tooltip = `${config.id} (${config.type})`;
    this.contextValue = 'providerItem';
  }
}

class ProviderEmptyNode extends vscode.TreeItem {
  constructor(message: string) {
    super(message, vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon('info');
    this.contextValue = 'empty';
  }
}

class ProviderErrorNode extends vscode.TreeItem {
  constructor(message: string) {
    super(message, vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon(
      'error',
      new vscode.ThemeColor('errorForeground'),
    );
    this.contextValue = 'error';
  }
}

export type ProviderTreeItem = ProviderNode | ProviderEmptyNode | ProviderErrorNode;

export class ProviderTreeProvider
  implements vscode.TreeDataProvider<ProviderTreeItem>
{
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<
    ProviderTreeItem | undefined | null | void
  >();

  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private readonly gistManager: StorageServiceManager) {}

  getTreeItem(element: ProviderTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<ProviderTreeItem[]> {
    try {
      const configs = this.gistManager.getConfig();

      if (configs.length === 0) {
        return [new ProviderEmptyNode(vscode.l10n.t('noActiveProviders'))];
      }

      return configs.map((config) => new ProviderNode(config));
    } catch (error) {
      return [new ProviderErrorNode(vscode.l10n.t('errorFetchingProviders'))];
    }
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }
}
