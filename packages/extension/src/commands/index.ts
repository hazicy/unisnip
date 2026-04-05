import * as vscode from 'vscode';
import type { GistServiceManager } from '../services/gist/gistManager';
import type { GistTreeItem } from '../views/tree/gistTreeData';
import {
  createFileCommand,
  createGistCommand,
  deleteFileCommand,
  deleteGistCommand,
  openGist,
  openInExternal,
  renameGist,
  uploadFileCommand,
} from './gist';
import { openProviderManager } from './provider';

/**
 * 注册所有命令
 */
export function registerAllCommands(
  gistManager: GistServiceManager,
  refreshCallback: () => void,
  context: vscode.ExtensionContext,
): vscode.Disposable[] {
  const commands = [
    vscode.commands.registerCommand('gisthub.openGist', openGist, context),
    vscode.commands.registerCommand(
      'gisthub.renameGist',
      (item: GistTreeItem) => renameGist(item, context, refreshCallback),
    ),
    vscode.commands.registerCommand(
      'gisthub.deleteGist',
      (item: GistTreeItem) => deleteGistCommand(item, context, refreshCallback),
    ),
    vscode.commands.registerCommand(
      'gisthub.deleteGistFile',
      (item: GistTreeItem) => deleteFileCommand(item, context, refreshCallback),
    ),
    vscode.commands.registerCommand(
      'gisthub.createFile',
      (item: GistTreeItem) => createFileCommand(item, context, refreshCallback),
    ),
    vscode.commands.registerCommand('gisthub.createGist', (item: any) =>
      createGistCommand(context, refreshCallback, item),
    ),
    vscode.commands.registerCommand('gisthub.uploadFile', () =>
      uploadFileCommand(context, refreshCallback),
    ),
    vscode.commands.registerCommand('gisthub.openInExternal', (item: any) =>
      openInExternal(context),
    ),
    // Provider management commands
    vscode.commands.registerCommand('gisthub.manageProviders', () =>
      openProviderManager(gistManager, context),
    ),
  ];

  return commands;
}
