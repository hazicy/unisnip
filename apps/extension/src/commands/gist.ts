import * as vscode from 'vscode';
import { SCHEMA } from '../extension';
import { StorageServiceManager } from '../services/storageManager';
import { StorageType } from '@gisthub/core';
import type { GistNode } from '../views/tree/treeItem';
import { ZERO_WIDTH_SPACE } from '../constants';

function buildUri(providerId: string, storagePath: string): vscode.Uri {
  const filename = storagePath.split('/').pop() || storagePath;
  return vscode.Uri.from({
    scheme: SCHEMA,
    authority: providerId,
    path: `/${filename}`,
    query: `path=${encodeURIComponent(storagePath)}`,
  });
}

export async function openGist(
  storagePath: string,
  providerId?: string,
): Promise<void> {
  if (!providerId) return;

  const uri = buildUri(providerId, storagePath);

  await vscode.commands.executeCommand('vscode.open', uri, {
    preview: true,
  });
}

export async function renameGist(
  item: GistNode,
  context: vscode.ExtensionContext,
  refreshCallback?: () => void,
): Promise<void> {
  if (!item.providerId) {
    return;
  }

  const manager = StorageServiceManager.getInstance(context);
  const service = manager.getService(item.providerId);

  if (!service) {
    vscode.window.showErrorMessage(vscode.l10n.t('errorRenamingFile'));
    return;
  }

  const currentName = item.entry.name;
  const newName = await vscode.window.showInputBox({
    value: currentName,
    prompt: vscode.l10n.t('enterNewName'),
  });

  if (!newName || newName === currentName) {
    return;
  }

  try {
    if (item.contextValue === 'gistFolder') {
      await service.updateEntry(item.entry.path, { name: newName });
    } else {
      const parentPath = item.entry.path.split('/').slice(0, -1).join('/');
      const newPath = parentPath ? `${parentPath}/${newName}` : newName;
      const content = await service.readContent(item.entry.path);

      await service.createEntry({
        path: newPath,
        name: newName,
        type: 'file',
        metadata: { content: content.content },
      });
      await service.deleteEntry(item.entry.path);
    }

    vscode.window.showInformationMessage(vscode.l10n.t('fileRenamed'));
    refreshCallback?.();
  } catch (error) {
    vscode.window.showErrorMessage(vscode.l10n.t('errorRenamingFile'));
  }
}

export async function deleteFileCommand(
  { providerId, resourceUri }: GistNode,
  _context: vscode.ExtensionContext,
  refreshCallback?: () => void,
): Promise<void> {
  if (!providerId) {
    return;
  }

  const confirm = await vscode.window.showWarningMessage(
    vscode.l10n.t('confirmDelete'),
    { modal: true },
    vscode.l10n.t('delete'),
  );

  if (confirm !== vscode.l10n.t('delete')) {
    return;
  }

  if (!resourceUri) {
    vscode.window.showErrorMessage(vscode.l10n.t('errorDeletingFile'));
    return;
  }

  try {
    await vscode.workspace.fs.delete(resourceUri);
    vscode.window.showInformationMessage(vscode.l10n.t('fileDeleted'));
    refreshCallback?.();
  } catch (error) {
    vscode.window.showErrorMessage(vscode.l10n.t('errorDeletingFile'));
  }
}

export async function createGistCommand(
  context: vscode.ExtensionContext,
  refreshCallback?: () => void,
  item?: GistNode,
): Promise<void> {
  try {
    const manager = StorageServiceManager.getInstance(context);
    const providers = manager.getAllServices();

    if (providers.length === 0) {
      vscode.window.showInformationMessage(vscode.l10n.t('noActiveProviders'));
      return;
    }

    let providerId: string;

    if (item?.providerId) {
      providerId = item.providerId;
    } else if (providers.length === 1) {
      providerId = providers[0][0];
    } else {
      const selected = await vscode.window.showQuickPick(
        providers.map(([id, service]) => ({
          label: id,
          description: `${service.getType()}:${service.getName()}`,
        })),
        {
          placeHolder: vscode.l10n.t('selectProvider'),
        },
      );

      if (!selected) {
        return;
      }

      providerId = selected.label;
    }

    const service = manager.getService(providerId);
    if (!service) {
      vscode.window.showErrorMessage(vscode.l10n.t('errorCreatingGist'));
      return;
    }

    const name = await vscode.window.showInputBox({
      prompt: vscode.l10n.t('enterGistDescription'),
      placeHolder: vscode.l10n.t('gistDescriptionPlaceholder'),
    });

    if (!name) return;

    if (service.getType() === StorageType.Gist) {
      const filename = await vscode.window.showInputBox({ prompt: '文件名' });
      if (!filename) return;

      await service.createEntry({
        name,
        type: 'folder',
        metadata: {
          public: false,
          defaultFilename: filename.trim(),
          defaultContent: `${ZERO_WIDTH_SPACE}`,
        },
      });
    } else {
      await service.createEntry({
        path: name,
        name,
        type: 'folder',
      });
    }

    vscode.window.showInformationMessage(vscode.l10n.t('gistCreated'));
    refreshCallback?.();
  } catch (error) {
    vscode.window.showErrorMessage(vscode.l10n.t('errorCreatingGist'));
  }
}

export async function createFileCommand(
  item: GistNode,
  context: vscode.ExtensionContext,
  refreshCallback?: () => void,
): Promise<void> {
  if (!item.providerId) {
    return;
  }

  const manager = StorageServiceManager.getInstance(context);
  const service = manager.getService(item.providerId);

  if (!service) {
    vscode.window.showErrorMessage(vscode.l10n.t('errorCreatingFile'));
    return;
  }

  const filename = await vscode.window.showInputBox({
    prompt: vscode.l10n.t('enterFileName'),
    placeHolder: vscode.l10n.t('fileNamePlaceholder'),
  });

  if (!filename) {
    return;
  }

  try {
    const basePath = item.entry.path;
    const path = `${basePath}/${filename}`.replace(/\/+/g, '/');

    await service.createEntry({
      path,
      name: filename,
      type: 'file',
      metadata: {
        content: `${ZERO_WIDTH_SPACE}`,
      },
    });

    vscode.window.showInformationMessage(vscode.l10n.t('fileCreated'));
    refreshCallback?.();
  } catch (error) {
    vscode.window.showErrorMessage(vscode.l10n.t('errorCreatingFile'));
  }
}

export async function deleteGistCommand(
  { label, resourceUri }: GistNode,
  _context: vscode.ExtensionContext,
  refreshCallback?: () => void,
): Promise<void> {
  const gistName = typeof label === 'string' ? label : label?.label || '';
  const confirm = await vscode.window.showWarningMessage(
    vscode.l10n.t('confirmDeleteGist', gistName),
    { modal: true },
    vscode.l10n.t('delete'),
  );

  if (confirm !== vscode.l10n.t('delete')) {
    return;
  }

  if (!resourceUri) {
    vscode.window.showErrorMessage(vscode.l10n.t('errorDeletingGist'));
    return;
  }

  try {
    await vscode.workspace.fs.delete(resourceUri, { recursive: false });
    vscode.window.showInformationMessage(vscode.l10n.t('gistDeleted'));
    refreshCallback?.();
  } catch (error) {
    vscode.window.showErrorMessage(vscode.l10n.t('errorDeletingGist'));
  }
}

export async function openInExternal(item: GistNode): Promise<void> {
  if (!item.providerId || item.contextValue !== 'gistFolder') {
    return;
  }

  const gistId = item.entry.path;
  const providerId = item.providerId.toLowerCase();
  let url: string | undefined;

  if (providerId.includes('gitee')) {
    url = `https://gitee.com/gists/${gistId}`;
  } else if (providerId.includes('github')) {
    url = `https://gist.github.com/${gistId}`;
  } else {
    vscode.window.showInformationMessage('当前存储类型不支持外部 Gist 链接');
    return;
  }

  await vscode.env.openExternal(vscode.Uri.parse(url));
}

export async function uploadFileCommand(
  context: vscode.ExtensionContext,
  refreshCallback?: () => void,
): Promise<void> {
  try {
    const manager = StorageServiceManager.getInstance(context);
    const providers = manager.getAllServices();

    if (providers.length === 0) {
      vscode.window.showInformationMessage(vscode.l10n.t('noActiveProviders'));
      return;
    }

    const fileUris = await vscode.window.showOpenDialog({
      canSelectMany: false,
      openLabel: vscode.l10n.t('selectFileToUpload'),
      filters: {
        'All Files': ['*'],
      },
    });

    if (!fileUris || fileUris.length === 0) {
      return;
    }

    const fileUri = fileUris[0];
    const fileName = fileUri.path.split(/[/\\]/).pop() || 'untitled';

    const fileContent = await vscode.workspace.fs.readFile(fileUri);
    const content = new TextDecoder().decode(fileContent);

    let providerId: string;
    if (providers.length === 1) {
      providerId = providers[0][0];
    } else {
      const selected = await vscode.window.showQuickPick(
        providers.map(([id, service]) => ({
          label: id,
          description: `${service.getType()}:${service.getName()}`,
        })),
        {
          placeHolder: vscode.l10n.t('selectProvider'),
        },
      );

      if (!selected) {
        return;
      }
      providerId = selected.label;
    }

    const service = manager.getService(providerId);
    if (!service) {
      vscode.window.showErrorMessage(vscode.l10n.t('errorUploadingFile'));
      return;
    }

    const validation = service.validateFileSize(content, fileName);
    if (!validation.valid) {
      const maxSize = service.getFileSizeLimit().maxFileSize / (1024 * 1024);
      vscode.window.showErrorMessage(
        vscode.l10n.t('fileTooLargeMessage', {
          maxSize: maxSize.toFixed(0),
          provider: service.getName(),
        }),
      );
      return;
    }

    if (service.getType() === StorageType.Gist) {
      const choice = await vscode.window.showQuickPick(
        [
          {
            label: vscode.l10n.t('createGistForFile'),
            value: 'new',
          },
          {
            label: vscode.l10n.t('uploadToExistingGist'),
            value: 'existing',
          },
        ],
        {
          placeHolder: vscode.l10n.t('selectProvider'),
        },
      );

      if (!choice) {
        return;
      }

      if (choice.value === 'new') {
        const description = await vscode.window.showInputBox({
          prompt: vscode.l10n.t('enterGistDescription'),
          placeHolder: vscode.l10n.t('gistDescriptionPlaceholder'),
          value: `Uploaded from ${fileName}`,
        });

        if (!description) {
          return;
        }

        await service.createEntry({
          name: description,
          type: 'folder',
          metadata: {
            public: false,
            defaultFilename: fileName,
            defaultContent: content,
          },
        });
      } else {
        const entries = await service.list('');
        const folders = entries.filter((entry) => entry.type === 'folder');

        if (folders.length === 0) {
          vscode.window.showInformationMessage(
            vscode.l10n.t('noActiveProviders'),
          );
          return;
        }

        const selectedFolder = await vscode.window.showQuickPick(
          folders.map((entry) => ({
            label: entry.name || entry.path,
            description: entry.path,
            entry,
          })),
          {
            placeHolder: vscode.l10n.t('selectProvider'),
          },
        );

        if (!selectedFolder) {
          return;
        }

        await service.createEntry({
          path: `${selectedFolder.entry.path}/${fileName}`,
          name: fileName,
          type: 'file',
          metadata: { content },
        });
      }
    } else {
      const targetDir = await vscode.window.showInputBox({
        prompt: '目标目录（可选）',
        placeHolder: 'folder/subfolder',
      });

      const targetPath = targetDir ? `${targetDir}/${fileName}` : fileName;

      await service.createEntry({
        path: targetPath,
        name: fileName,
        type: 'file',
        metadata: { content },
      });
    }

    vscode.window.showInformationMessage(vscode.l10n.t('fileUploaded'));
    refreshCallback?.();
  } catch (error) {
    vscode.window.showErrorMessage(vscode.l10n.t('errorUploadingFile'));
  }
}
