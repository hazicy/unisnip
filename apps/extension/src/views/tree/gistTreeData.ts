import * as vscode from 'vscode';
import type { Gist } from '../../providers/gist/types';
import type { GistServiceManager } from '../../services/gist/gistManager';
import { SCHEMA } from '../../extension';

export type GistTreeItem = {
  gist?: Gist;
  providerId: string;
} & vscode.TreeItem;

export class GistTreeProvider implements vscode.TreeDataProvider<GistTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<
    GistTreeItem | undefined | null | void
  >();

  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private readonly gistManager: GistServiceManager) {}

  getTreeItem(element: GistTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(
    element?: GistTreeItem | undefined,
  ): Promise<GistTreeItem[]> {
    try {
      if (!element) {
        return await this.getAllGistItems();
      }

      const items = await this.getFileItems(element);

      return items;
    } catch (error) {
      vscode.window.showErrorMessage(vscode.l10n.t('errorFetchingGists'));
      return [];
    }
  }

  private async getAllGistItems(): Promise<GistTreeItem[]> {
    const providers = this.gistManager.getAllServices();

    if (providers.length === 0) {
      vscode.window.showInformationMessage(vscode.l10n.t('noActiveProviders'));
      return [];
    }

    const items: GistTreeItem[] = [];

    for (const [providerId, provider] of providers) {
      const gists = await provider.getGists();
      for (const gist of gists) {
        const gistUri = vscode.Uri.from({
          scheme: SCHEMA,
          authority: providerId,
          query: `id=${gist.id}`,
        });

        items.push({
          gist,
          collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
          iconPath: new vscode.ThemeIcon('note'),
          id: gist.id,
          label: gist.description || vscode.l10n.t('unnamedGist'),
          providerId,
          resourceUri: gistUri,
          contextValue: 'gistFolder',
        });
      }
    }

    return items;
  }

  private async getFileItems(element: GistTreeItem): Promise<GistTreeItem[]> {
    if (!element.providerId || !element.id) {
      return [];
    }

    const service = this.gistManager.getService(element.providerId);

    if (!service) {
      return [];
    }

    const gist = await service.getGist(element.id);

    if (!gist) {
      return [];
    }

    const files = Object.keys(gist.files ?? {});

    const items = files.map((filename): GistTreeItem => {
      const fileUri = vscode.Uri.from({
        scheme: SCHEMA,
        authority: element.providerId,
        path: `/${filename}`,
        query: `id=${gist.id}`,
      });

      return {
        id: filename,
        label: filename,
        iconPath: vscode.ThemeIcon.File,
        command: {
          command: 'gisthub.openGist',
          title: vscode.l10n.t('openGist'),
          arguments: [element.id, filename, element.providerId],
        },
        providerId: element.providerId,
        resourceUri: fileUri,
        contextValue: 'gistItem',
      };
    });

    return items;
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }
}
