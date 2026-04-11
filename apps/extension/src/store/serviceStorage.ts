import * as vscode from 'vscode';
import type { ProviderConfig } from '../types';

const KEY = 'gist.services';

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
