import * as vscode from 'vscode';
import type { StorageServiceManager } from '../services/storageManager';
import {
  deleteFileCommand,
  deleteGistCommand,
  openGist,
  openInExternal,
  renameGist,
  uploadFileCommand,
} from './gist';
import {
  addProvider,
  deleteProviderById,
  openProviderManager,
  reconnectProviderById,
} from './provider';
import type { GistNode } from '../views/tree/treeItem';
import { ProviderNode } from '../views/provider/providerTreeData';

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
    vscode.commands.registerCommand('gisthub.addProvider', () =>
      addProvider(context, refreshCallback),
    ),
    vscode.commands.registerCommand(
      'gisthub.reconnectProvider',
      (item: ProviderNode) =>
        reconnectProviderById(
          item.config.id,
          gistManager,
          context,
          refreshCallback,
        ),
    ),
    vscode.commands.registerCommand('gisthub.deleteProvider', (item: ProviderNode) =>
      deleteProviderById(item.config.id, gistManager, refreshCallback),
    ),
    vscode.commands.registerCommand('gisthub.refreshProviders', refreshCallback),
  ];

  return commands;
}
