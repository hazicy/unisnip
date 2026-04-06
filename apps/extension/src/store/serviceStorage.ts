import * as vscode from 'vscode';
import type { ProviderConfig } from '../providers/gist/types';

const KEY = 'gist.services1';

export function loadServices(
  context: vscode.ExtensionContext,
): ProviderConfig[] {
  return context.globalState.get<ProviderConfig[]>(KEY, []);
}

export async function saveService(
  context: vscode.ExtensionContext,
  services: ProviderConfig[],
): Promise<void> {
  await context.globalState.update(KEY, services);
}
