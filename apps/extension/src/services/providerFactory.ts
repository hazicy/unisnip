import * as vscode from 'vscode';
import { StorageType, GistSubType, type StorageConfig } from '@gisthub/core';
import { StorageServiceManager } from './storageManager';
import type { ProviderConfig } from '../providers/gist/types';

export async function createProvider(
  config: ProviderConfig,
  context: vscode.ExtensionContext,
  alias?: string,
) {
  const manager = StorageServiceManager.getInstance(context);

  const proxyUrl =
    vscode.workspace
      .getConfiguration('gisthub')
      .get<string>('githubApiProxy', '') || undefined;

  const finalId = alias ?? config.id;

  const finalConfig: ProviderConfig = {
    ...config,
    id: finalId,
    proxyUrl:
      config.type === StorageType.Gist && config.subType === GistSubType.GitHub
        ? proxyUrl
        : config.proxyUrl,
  };

  await manager.registerService(finalId, finalConfig);
}

export function buildGistConfig(subType: GistSubType): StorageConfig {
  return {
    type: StorageType.Gist,
    subType,
  };
}
