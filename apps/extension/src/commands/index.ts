import * as vscode from 'vscode';
import type { StorageServiceManager } from '../services/storageManager';
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
import type { GistNode } from '../views/tree/treeItem';

export function registerAllCommands(
  gistManager: StorageServiceManager,
  refreshCallback: () => void,
  context: vscode.ExtensionContext,
): vscode.Disposable[] {
  const commands = [
    vscode.commands.registerCommand('gisthub.openGist', openGist, context),
    vscode.commands.registerCommand('gisthub.renameGist', (item: GistNode) =>
      renameGist(item, context, refreshCallback),
    ),
    vscode.commands.registerCommand('gisthub.deleteGist', (item: GistNode) =>
      deleteGistCommand(item, context, refreshCallback),
    ),
    vscode.commands.registerCommand(
      'gisthub.deleteGistFile',
      (item: GistNode) => deleteFileCommand(item, context, refreshCallback),
    ),
    vscode.commands.registerCommand('gisthub.createFile', (item: GistNode) =>
      createFileCommand(item, context, refreshCallback),
    ),
    vscode.commands.registerCommand('gisthub.createGist', (item?: GistNode) =>
      createGistCommand(context, refreshCallback, item),
    ),
    vscode.commands.registerCommand('gisthub.uploadFile', () =>
      uploadFileCommand(context, refreshCallback),
    ),
    vscode.commands.registerCommand(
      'gisthub.openInExternal',
      (item: GistNode) => openInExternal(item),
    ),
    vscode.commands.registerCommand('gisthub.manageProviders', () =>
      openProviderManager(gistManager, context, refreshCallback),
    ),
  ];

  return commands;
}
