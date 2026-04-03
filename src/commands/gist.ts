import * as vscode from 'vscode';
import { SCHEMA } from '../extension';
import type { GistTreeItem } from '../views/tree/gistTreeData';
import { GistServiceManager } from '../services/gist/gistManager';

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
  { id, label }: GistTreeItem,
  context: vscode.ExtensionContext,
  refreshCallback?: () => void,
): Promise<void> {
  if (!id) {
    throw vscode.FileSystemError.FileExists();
  }

  const manager = GistServiceManager.getInstance(context);
  const service = manager.getService(id);
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
  { id, label, resourceUri }: GistTreeItem,
  context: vscode.ExtensionContext,
  refreshCallback?: () => void,
): Promise<void> {
  if (!id) {
    throw vscode.FileSystemError.FileExists();
  }

  const manager = GistServiceManager.getInstance(context);
  const service = manager.getService(id);
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
          content: '/n',
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
  if (!id) {
    throw vscode.FileSystemError.FileExists();
  }

  const manager = GistServiceManager.getInstance(context);
  const service = manager.getService(id);
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
