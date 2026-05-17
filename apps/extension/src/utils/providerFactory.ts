import * as vscode from 'vscode';
import { StorageServiceManager } from '../services/storageManager';
import type { ProviderConfig } from '../types';

export async function createProvider(
  config: ProviderConfig,
  context: vscode.ExtensionContext,
  alias?: string,
) {
  const manager = StorageServiceManager.getInstance(context);

  const finalId = alias ?? config.id;

  await manager.registerService(finalId, config);
}
