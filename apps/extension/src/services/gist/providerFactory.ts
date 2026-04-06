import * as vscode from 'vscode';
import { GistProviderEnum } from '@gisthub/core';
import { GistServiceManager } from './gistManager';
import { createGistService } from '@gisthub/core';

export async function createProvider(
  type: GistProviderEnum,
  token: string,
  context: vscode.ExtensionContext,
  alias?: string,
) {
  const manager = GistServiceManager.getInstance(context);

  const proxyUrl =
    vscode.workspace
      .getConfiguration('gisthub')
      .get<string>('githubApiProxy', '') || undefined;

  const service = createGistService(type, token, proxyUrl);

  const id = alias ?? (type === GistProviderEnum.GitHub ? 'github' : 'gitee');

  switch (type) {
    case GistProviderEnum.GitHub:
      manager.registerService(id, service);
      break;
    case GistProviderEnum.Gitee:
      manager.registerService(id, service);
      break;
  }
}
