import * as vscode from 'vscode';
import type { Gist } from '../../providers/gist/types';
import { SCHEMA } from '../../extension';

export class GistFolderNode extends vscode.TreeItem {
  constructor(
    public readonly gist: Gist,
    public readonly providerId: string,
  ) {
    super(
      gist.description || vscode.l10n.t('unnamedGist'),
      vscode.TreeItemCollapsibleState.Collapsed,
    );
    this.id = gist.id;
    this.iconPath = new vscode.ThemeIcon('note');
    this.contextValue = 'gistFolder';
    this.resourceUri = vscode.Uri.from({
      scheme: SCHEMA,
      authority: providerId,
      query: `id=${gist.id}`,
    });
  }
}

export class GistFileNode extends vscode.TreeItem {
  constructor(
    public readonly filename: string,
    public readonly gistId: string,
    public readonly providerId: string,
  ) {
    super(filename, vscode.TreeItemCollapsibleState.None);
    this.id = gistId;
    this.iconPath = vscode.ThemeIcon.File;
    this.contextValue = 'gistItem';
    this.resourceUri = vscode.Uri.from({
      scheme: SCHEMA,
      authority: providerId,
      path: `/${filename}`,
      query: `id=${gistId}`,
    });
    this.command = {
      command: 'gisthub.openGist',
      title: vscode.l10n.t('openGist'),
      arguments: [gistId, filename, providerId],
    };
  }
}

export class ErrorNode extends vscode.TreeItem {
  constructor(message: string) {
    super(message, vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon(
      'error',
      new vscode.ThemeColor('errorForeground'),
    );
    this.contextValue = 'error';
  }
}

export class EmptyNode extends vscode.TreeItem {
  constructor(message: string) {
    super(message, vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon('info');
    this.contextValue = 'empty';
  }
}

export type GistTreeItem =
  | GistFolderNode
  | GistFileNode
  | ErrorNode
  | EmptyNode;

export type GistNode = GistFolderNode | GistFileNode;
