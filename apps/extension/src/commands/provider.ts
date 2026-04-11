import * as vscode from 'vscode';
import { StorageType, GistSubType, type StorageConfig } from '@gisthub/core';
import type { ProviderConfig } from '../types';
import { createProvider } from '../utils/providerFactory';
import type { StorageServiceManager } from '../services/storageManager';

const PROVIDER_OPTIONS = [
  {
    label: '$(mark-github) Add GitHub Gist',
    value: { type: StorageType.Gist, subType: GistSubType.GitHub } as const,
  },
  {
    label: '$(cloud) Add Gitee Gist',
    value: { type: StorageType.Gist, subType: GistSubType.Gitee } as const,
  },
  { label: '$(database) Add S3', value: { type: StorageType.S3 } as const },
  {
    label: '$(server-environment) Add WebDAV',
    value: { type: StorageType.WebDAV } as const,
  },
] as const;

function getProviderIcon(config: ProviderConfig): string {
  if (config.type === StorageType.Gist) {
    if (config.subType === GistSubType.GitHub) return '$(mark-github)';
    if (config.subType === GistSubType.Gitee) return '$(cloud)';
  }

  if (config.type === StorageType.S3) return '$(database)';
  if (config.type === StorageType.WebDAV) return '$(server-environment)';

  return '$(plug)';
}

function getProviderDescription(config: ProviderConfig): string {
  if (config.type === StorageType.Gist) {
    return config.subType === GistSubType.GitHub ? 'GitHub Gist' : 'Gitee Gist';
  }

  if (config.type === StorageType.S3) {
    return `S3 ${config.bucket ? `(${config.bucket})` : ''}`.trim();
  }

  if (config.type === StorageType.WebDAV) {
    return `WebDAV ${config.endpoint ? `(${config.endpoint})` : ''}`.trim();
  }

  return config.type;
}

async function askText(
  prompt: string,
  placeHolder: string,
  required = false,
  password = false,
): Promise<string | undefined> {
  const value = await vscode.window.showInputBox({
    prompt,
    placeHolder,
    password,
    ignoreFocusOut: true,
  });

  if (required && (!value || !value.trim())) {
    vscode.window.showErrorMessage(vscode.l10n.t('invalidGistUri'));
    return undefined;
  }

  return value?.trim();
}

async function buildConfigFromSelection(
  selection: (typeof PROVIDER_OPTIONS)[number]['value'],
): Promise<StorageConfig | undefined> {
  if (selection.type === StorageType.Gist) {
    return {
      type: StorageType.Gist,
      subType: selection.subType,
    };
  }

  if (selection.type === StorageType.S3) {
    const bucket = await askText('S3 Bucket', 'my-bucket', true);
    if (!bucket) return undefined;

    const endpoint = await askText(
      'S3 Endpoint (optional for AWS)',
      'https://s3.amazonaws.com',
    );
    const region = await askText('S3 Region', 'us-east-1', false);
    const accessKeyId = await askText('S3 Access Key ID', 'AKIA...', true);
    if (!accessKeyId) return undefined;
    const secretAccessKey = await askText(
      'S3 Secret Access Key',
      '******',
      true,
      true,
    );
    if (!secretAccessKey) return undefined;
    const basePath = await askText('Base Path (optional)', 'folder/subfolder');

    return {
      type: StorageType.S3,
      bucket,
      endpoint: endpoint || undefined,
      region: region || undefined,
      accessKeyId,
      secretAccessKey,
      basePath: basePath || undefined,
    };
  }

  const endpoint = await askText(
    'WebDAV Endpoint',
    'https://dav.example.com/remote.php/dav/files/user',
    true,
  );
  if (!endpoint) return undefined;

  const token = await askText(
    'WebDAV Auth (username:password 或 Bearer token)',
    'username:password',
    true,
    true,
  );
  if (!token) return undefined;

  const basePath = await askText('Base Path (optional)', 'notes');

  return {
    type: StorageType.WebDAV,
    endpoint,
    token,
    basePath: basePath || undefined,
  };
}

export async function openProviderManager(
  gistManager: StorageServiceManager,
  context: vscode.ExtensionContext,
  refreshCallback?: () => void,
): Promise<void> {
  const configs = gistManager.getConfig();

  if (configs.length === 0) {
    await handleAddProvider(context, refreshCallback);
    return;
  }

  await handleManageProviders(configs, context, gistManager, refreshCallback);
}

async function handleAddProvider(
  context: vscode.ExtensionContext,
  refreshCallback?: () => void,
): Promise<void> {
  const pick = await vscode.window.showQuickPick(PROVIDER_OPTIONS, {
    placeHolder: vscode.l10n.t('noActiveProviders'),
  });

  if (!pick) {
    return;
  }

  const alias = await vscode.window.showInputBox({
    prompt: vscode.l10n.t('enterGistName'),
    placeHolder: 'provider-id',
  });

  if (alias === undefined) {
    return;
  }

  const config = await buildConfigFromSelection(pick.value);
  if (!config) return;

  await createProvider(
    { ...config, id: alias || pick.value.type },
    context,
    alias,
  );

  refreshCallback?.();
}

type ProviderAction = 'reauthenticate' | 'delete';

interface ProviderQuickPickItem extends vscode.QuickPickItem {
  action: ProviderAction;
  providerId?: string;
}

async function handleManageProviders(
  configs: ProviderConfig[],
  context: vscode.ExtensionContext,
  gistManager: StorageServiceManager,
  refreshCallback?: () => void,
): Promise<void> {
  const providerItems = [
    ...configs.map((config) => ({
      label: `${getProviderIcon(config)} ${config.id}`,
      description: getProviderDescription(config),
      detail: config.enabled ? '$(check) Enabled' : '$(circle-slash) Disabled',
      config,
    })),
    { label: '', kind: vscode.QuickPickItemKind.Separator, config: null },
    { label: '$(add) Add New Provider', config: null },
  ];

  const selectedProvider = await vscode.window.showQuickPick(providerItems, {
    placeHolder: vscode.l10n.t('manageProviders.title'),
  });

  if (!selectedProvider) {
    return;
  }

  if (!selectedProvider.config) {
    await handleAddProvider(context, refreshCallback);
    return;
  }

  const actionItems: ProviderQuickPickItem[] = [
    {
      label: '$(refresh) Reconnect',
      description: selectedProvider.config.id,
      action: 'reauthenticate',
      providerId: selectedProvider.config.id,
    },
    {
      label: '$(trash) Delete',
      description: selectedProvider.config.id,
      action: 'delete',
      providerId: selectedProvider.config.id,
    },
  ];

  const selectedAction = await vscode.window.showQuickPick(actionItems, {
    placeHolder: selectedProvider.config.id,
  });

  if (!selectedAction) {
    return;
  }

  await executeProviderAction(
    selectedAction,
    context,
    gistManager,
    refreshCallback,
  );
}

async function executeProviderAction(
  item: ProviderQuickPickItem,
  context: vscode.ExtensionContext,
  gistManager: StorageServiceManager,
  refreshCallback?: () => void,
): Promise<void> {
  switch (item.action) {
    case 'reauthenticate':
      if (item.providerId) {
        await reconnectProvider(
          item.providerId,
          gistManager,
          context,
          refreshCallback,
        );
      }
      break;
    case 'delete':
      if (item.providerId) {
        await deleteProvider(item.providerId, gistManager);
      }
      break;
  }
}

async function reconnectProvider(
  providerId: string,
  gistManager: StorageServiceManager,
  context: vscode.ExtensionContext,
  refreshCallback?: () => void,
): Promise<void> {
  const configs = gistManager.getConfig();
  const config = configs.find((c) => c.id === providerId);

  if (!config) {
    vscode.window.showErrorMessage('Provider configuration not found');
    return;
  }

  await createProvider(config, context, providerId);

  refreshCallback?.();

  vscode.window.showInformationMessage(vscode.l10n.t('gistUpdated'));
}

async function deleteProvider(
  providerId: string,
  gistManager: StorageServiceManager,
): Promise<void> {
  const confirm = await vscode.window.showWarningMessage(
    vscode.l10n.t('confirmDelete', providerId),
    { modal: true },
    vscode.l10n.t('confirm'),
  );

  if (!confirm) {
    return;
  }

  await gistManager.removeService(providerId);

  vscode.window.showInformationMessage(
    vscode.l10n.t('providerDeleted', providerId),
  );
}
