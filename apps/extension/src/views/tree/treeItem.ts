import * as vscode from 'vscode';
import type { StorageEntry } from '@gisthub/core';
import { SCHEMA } from '../../extension';

function encodePath(path: string): string {
  return encodeURIComponent(path);
}

export class GistFolderNode extends vscode.TreeItem {
  constructor(
    public readonly entry: StorageEntry,
    public readonly providerId: string,
  ) {
    super(
      entry.name || vscode.l10n.t('unnamedGist'),
      vscode.TreeItemCollapsibleState.Collapsed,
    );
    this.id = `${providerId}:${entry.path}`;
    this.iconPath = new vscode.ThemeIcon('note');
    this.contextValue = 'gistFolder';
    this.resourceUri = vscode.Uri.from({
      scheme: SCHEMA,
      authority: providerId,
      query: `path=${encodePath(entry.path)}`,
    });
  }
}

export class GistFileNode extends vscode.TreeItem {
  constructor(
    public readonly entry: StorageEntry,
    public readonly providerId: string,
  ) {
    super(entry.name, vscode.TreeItemCollapsibleState.None);
    this.id = `${providerId}:${entry.path}`;
    this.iconPath = vscode.ThemeIcon.File;
    this.contextValue = 'gistItem';
    this.resourceUri = vscode.Uri.from({
      scheme: SCHEMA,
      authority: providerId,
      path: `/${entry.name}`,
      query: `path=${encodePath(entry.path)}`,
    });
    this.command = {
      command: 'gisthub.openGist',
      title: vscode.l10n.t('openGist'),
      arguments: [entry.path, providerId],
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
