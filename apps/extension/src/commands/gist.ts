import * as vscode from 'vscode';
import { SCHEMA } from '../extension';
import type { GistTreeItem } from '../views/tree/gistTreeData';
import { GistServiceManager } from '../services/gist/gistManager';
import { GistProviderEnum } from '@gisthub/core';

export async function openGist(
  id: string,
  filename: string,
  providerId?: string,
): Promise<void> {
  const gistUri = vscode.Uri.from({
    scheme: SCHEMA,
    authority: providerId,
    path: `/${filename}`,
    query: `id=${id}`,
  });

  vscode.commands.executeCommand('vscode.open', gistUri, {
    preview: true,
  });
}

export async function renameGist(
  { id, label, providerId }: GistTreeItem,
  context: vscode.ExtensionContext,
  refreshCallback?: () => void,
): Promise<void> {
  if (!id) {
    return;
  }

  const manager = GistServiceManager.getInstance(context);
  const service = manager.getService(providerId);
  const currentName = typeof label === 'string' ? label : label?.label || '';

  const newName = await vscode.window.showInputBox({
    value: currentName,
    prompt: vscode.l10n.t('enterNewName'),
  });

  if (!newName || newName === currentName) {
    return;
  }

  try {
    await service?.updateGist(id, {
      files: {
        [currentName]: null,
        [newName]: {
          content: '',
        },
      },
    });

    vscode.window.showInformationMessage(vscode.l10n.t('fileRenamed'));
    refreshCallback?.();
  } catch (error) {
    vscode.window.showErrorMessage(vscode.l10n.t('errorRenamingFile'));
  }
}

export async function deleteFileCommand(
  { id, providerId, resourceUri }: GistTreeItem,
  context: vscode.ExtensionContext,
  refreshCallback?: () => void,
): Promise<void> {
  if (!id || !providerId) {
    return;
  }

  const manager = GistServiceManager.getInstance(context);
  const service = manager.getService(providerId);
  const confirm = await vscode.window.showWarningMessage(
    vscode.l10n.t('confirmDelete'),
    { modal: true },
    vscode.l10n.t('delete'),
  );

  if (confirm !== vscode.l10n.t('delete')) {
    return;
  }

  if (!resourceUri) {
    throw new Error('');
  }

  try {
    vscode.workspace.fs.delete(resourceUri);
    vscode.window.showInformationMessage(vscode.l10n.t('fileDeleted'));
    refreshCallback?.();
  } catch (error) {
    vscode.window.showErrorMessage(vscode.l10n.t('errorDeletingFile'));
  }
}

export async function createGistCommand(
  context: vscode.ExtensionContext,
  refreshCallback?: () => void,
  item?: GistTreeItem,
): Promise<void> {
  try {
    const manager = GistServiceManager.getInstance(context);
    const providers = manager.getAllServices();

    if (providers.length === 0) {
      vscode.window.showInformationMessage(vscode.l10n.t('noActiveProviders'));
      return;
    }

    let providerId: string;

    // 如果是从 folder 右键创建，使用该 folder 的 provider
    if (item?.providerId) {
      providerId = item.providerId;
    }
    // 如果只有一个 provider，直接使用
    else if (providers.length === 1) {
      providerId = providers[0][0];
    }
    // 如果有多个 provider，让用户选择
    else {
      const selected = await vscode.window.showQuickPick(
        providers.map(([id, service]) => ({
          label: id,
          description: service.getProviderName(),
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

    const description = await vscode.window.showInputBox({
      prompt: vscode.l10n.t('enterGistDescription'),
      placeHolder: vscode.l10n.t('gistDescriptionPlaceholder'),
    });

    if (!description) {
      return;
    }

    const service = manager.getService(providerId);
    await service?.createGist({
      description,
      public: false,
      files: {
        'README.md': {
          content: 'Hello World',
        },
      },
    });

    vscode.window.showInformationMessage(vscode.l10n.t('gistCreated'));
    refreshCallback?.();
  } catch (error) {
    vscode.window.showErrorMessage(vscode.l10n.t('errorCreatingGist'));
  }
}

export async function createFileCommand(
  { id, providerId }: GistTreeItem,
  context: vscode.ExtensionContext,
  refreshCallback?: () => void,
): Promise<void> {
  if (!id) {
    throw vscode.FileSystemError.FileExists();
  }

  const manager = GistServiceManager.getInstance(context);
  const service = manager.getService(providerId);

  if (!service) {
    throw new Error('找不到这个服务');
  }

  const filename = await vscode.window.showInputBox({
    prompt: vscode.l10n.t('enterFileName'),
    placeHolder: vscode.l10n.t('fileNamePlaceholder'),
  });

  if (!filename) {
    return;
  }

  try {
    await service.updateGist(id, {
      files: {
        [filename]: {
          content: '',
        },
      },
    });

    vscode.window.showInformationMessage(vscode.l10n.t('fileCreated'));
    refreshCallback?.();
  } catch (error) {
    vscode.window.showErrorMessage(vscode.l10n.t('errorCreatingFile'));
  }
}

export async function deleteGistCommand(
  { id, label, providerId, resourceUri }: GistTreeItem,
  context: vscode.ExtensionContext,
  refreshCallback?: () => void,
): Promise<void> {
  if (!id || !providerId) {
    return;
  }

  const manager = GistServiceManager.getInstance(context);
  const service = manager.getService(providerId);
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
    throw new Error('');
  }

  try {
    vscode.workspace.fs.delete(resourceUri, { recursive: false });
    vscode.window.showInformationMessage(vscode.l10n.t('gistDeleted'));
    refreshCallback?.();
  } catch (error) {
    vscode.window.showErrorMessage(vscode.l10n.t('errorDeletingGist'));
  }
}

export async function openInExternal(context: vscode.ExtensionContext) {}

/**
 * 上传文件到 Gist
 */
export async function uploadFileCommand(
  context: vscode.ExtensionContext,
  refreshCallback?: () => void,
): Promise<void> {
  try {
    const manager = GistServiceManager.getInstance(context);
    const providers = manager.getAllServices();

    if (providers.length === 0) {
      vscode.window.showInformationMessage(vscode.l10n.t('noActiveProviders'));
      return;
    }

    // 让用户选择要上传的文件
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

    // 读取文件内容
    const fileContent = await vscode.workspace.fs.readFile(fileUri);
    const content = new TextDecoder().decode(fileContent);

    // 选择目标 Provider
    let providerId: string;
    if (providers.length === 1) {
      providerId = providers[0][0];
    } else {
      const selected = await vscode.window.showQuickPick(
        providers.map(([id, service]) => ({
          label: id,
          description: service.getProviderName(),
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
      throw new Error('Service not found');
    }

    // 验证文件大小
    const validation = service.validateFileSize(content, fileName);
    if (!validation.valid) {
      const maxSize = service.getFileSizeLimit().maxFileSize / (1024 * 1024);
      const providerName =
        service.getProviderName() === GistProviderEnum.Gitee
          ? 'Gitee'
          : 'GitHub';
      vscode.window.showErrorMessage(
        vscode.l10n.t('fileTooLargeMessage', {
          maxSize: maxSize.toFixed(0),
          provider: providerName,
        }),
      );
      return;
    }

    // 询问是创建新 Gist 还是上传到现有 Gist
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
      // 创建新 Gist
      const description = await vscode.window.showInputBox({
        prompt: vscode.l10n.t('enterGistDescription'),
        placeHolder: vscode.l10n.t('gistDescriptionPlaceholder'),
        value: `Uploaded from ${fileName}`,
      });

      if (!description) {
        return;
      }

      await service.createGist({
        description,
        public: false,
        files: {
          [fileName]: {
            content,
          },
        },
      });

      vscode.window.showInformationMessage(vscode.l10n.t('fileUploaded'));
      refreshCallback?.();
    } else {
      // 上传到现有 Gist - 获取用户的所有 Gist
      const gists = await service.getGists();

      if (gists.length === 0) {
        vscode.window.showInformationMessage(
          vscode.l10n.t('noActiveProviders'),
        );
        return;
      }

      const selectedGist = await vscode.window.showQuickPick(
        gists.map((gist: any) => ({
          label: gist.description || vscode.l10n.t('unnamedGist'),
          description: gist.id,
          gist,
        })),
        {
          placeHolder: vscode.l10n.t('selectProvider'),
        },
      );

      if (!selectedGist) {
        return;
      }

      await service.updateGistContent(selectedGist.gist.id, fileName, content);
      vscode.window.showInformationMessage(vscode.l10n.t('fileUploaded'));
      refreshCallback?.();
    }
  } catch (error) {
    console.error('Error uploading file:', error);
    vscode.window.showErrorMessage(vscode.l10n.t('errorUploadingFile'));
  }
}
