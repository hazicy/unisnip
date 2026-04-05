import * as vscode from 'vscode';

export class ErrorTreeItem extends vscode.TreeItem {
  constructor(message: string) {
    super(message, vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon(
      'error',
      new vscode.ThemeColor('errorForeground'),
    );
    this.contextValue = 'error';
  }
}

export class GistTreeItem extends vscode.TreeItem {
  constructor(message: string) {
    super(message, vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon(
      'error',
      new vscode.ThemeColor('errorForeground'),
    );
    this.contextValue = 'error';
  }
}
