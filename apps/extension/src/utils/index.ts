import * as vscode from 'vscode';

export function parseUri(uri: vscode.Uri): {
  storagePath: string;
  filename: string;
  providerId: string;
} {
  const providerId = uri.authority;
  if (!providerId) {
    throw vscode.FileSystemError.FileNotFound(uri);
  }

  const params = new URLSearchParams(uri.query);
  const path = params.get('path');

  if (!path) {
    throw new Error(vscode.l10n.t('invalidGistUri'));
  }

  const storagePath = decodeURIComponent(path);
  const filename = storagePath.split('/').pop() || storagePath;

  return { storagePath, filename, providerId };
}
