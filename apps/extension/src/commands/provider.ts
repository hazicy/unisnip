import * as vscode from 'vscode';
import {
  GistProviderEnum as GistProviderEnum,
  type ProviderConfig,
} from '../providers/gist/types';
import { createProvider } from '../services/gist/providerFactory';
import {
  getGiteeAccessToken,
  getGithubAccessToken,
} from '../services/authService';
import type { GistServiceManager } from '../services/gist/gistManager';

const PROVIDER_OPTIONS = [
  { label: '$(mark-github) Add GitHub', value: GistProviderEnum.GitHub },
  { label: '$(cloud) Add Gitee', value: GistProviderEnum.Gitee },
] as const;

const PROVIDER_TOKEN_GETTERS: Record<GistProviderEnum, () => Promise<string>> =
  {
    [GistProviderEnum.GitHub]: getGithubAccessToken,
    [GistProviderEnum.Gitee]: getGiteeAccessToken,
  };

const PROVIDER_ICONS: Record<GistProviderEnum, string> = {
  [GistProviderEnum.GitHub]: '$(mark-github)',
  [GistProviderEnum.Gitee]: '$(cloud)',
};

function getProviderIcon(config: ProviderConfig): string {
  return PROVIDER_ICONS[config.provider as GistProviderEnum] ?? '$(plug)';
}

export async function openProviderManager(
  gistManager: GistServiceManager,
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
    placeHolder: pick.value === GistProviderEnum.GitHub ? 'GitHub' : 'Gitee',
  });

  if (alias === undefined) {
    return;
  }

  const getToken = PROVIDER_TOKEN_GETTERS[pick.value];
  const token = await getToken();
  await createProvider(pick.value, token, context, alias);

  refreshCallback?.();
}

type ProviderAction = 'reauthenticate' | 'delete' | 'add';

interface ProviderQuickPickItem extends vscode.QuickPickItem {
  action: ProviderAction;
  providerId?: string;
}

async function handleManageProviders(
  configs: ProviderConfig[],
  context: vscode.ExtensionContext,
  gistManager: GistServiceManager,
  refreshCallback?: () => void,
): Promise<void> {
  // 第一级：选择 provider
  const providerItems = [
    ...configs.map((config) => ({
      label: `${getProviderIcon(config)} ${config.id}`,
      description: config.enabled
        ? '$(check) Enabled'
        : '$(circle-slash) Disabled',
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

  // 选了 Add New Provider
  if (!selectedProvider.config) {
    await handleAddProvider(context, refreshCallback);
    return;
  }

  // 第二级：选择操作
  const actionItems: ProviderQuickPickItem[] = [
    {
      label: '$(refresh) Re-authenticate',
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
  gistManager: GistServiceManager,
  refreshCallback?: () => void,
): Promise<void> {
  switch (item.action) {
    case 'add':
      await handleAddProvider(context, refreshCallback);
      break;
    case 'reauthenticate':
      if (item.providerId) {
        await reauthenticateProvider(
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

export async function addProvider(
  gistManager: GistServiceManager,
  type: GistProviderEnum,
): Promise<void> {
  const alias = await vscode.window.showInputBox({
    prompt: vscode.l10n.t('enterGistName'),
    placeHolder: type === GistProviderEnum.GitHub ? 'GitHub' : 'Gitee',
  });

  if (alias === undefined) {
    return;
  }

  // 使用 OAuth 获取 token
  const getToken = PROVIDER_TOKEN_GETTERS[type];
  const token = await getToken();

  await createProvider(type, token, gistManager.context, alias);

  vscode.window.showInformationMessage(vscode.l10n.t('gistUpdated'));
}

async function reauthenticateProvider(
  providerId: string,
  gistManager: GistServiceManager,
  context: vscode.ExtensionContext,
  refreshCallback?: () => void,
): Promise<void> {
  const configs = gistManager.getConfig();
  const config = configs.find((c) => c.id === providerId);

  if (!config || !config.provider) {
    vscode.window.showErrorMessage('Provider configuration not found');
    return;
  }

  const providerType = config.provider;

  // 使用 OAuth 重新获取 token
  const getToken = PROVIDER_TOKEN_GETTERS[providerType];
  const token = await getToken();

  // 重新创建 provider
  await createProvider(providerType, token, context, providerId);

  refreshCallback?.();

  vscode.window.showInformationMessage(vscode.l10n.t('gistUpdated'));
}

async function deleteProvider(
  providerId: string,
  gistManager: GistServiceManager,
): Promise<void> {
  const confirm = await vscode.window.showWarningMessage(
    vscode.l10n.t('confirmDelete', providerId),
    { modal: true },
    vscode.l10n.t('confirm'),
  );

  if (!confirm) {
    return;
  }

  gistManager.removeService(providerId);

  vscode.window.showInformationMessage(
    vscode.l10n.t('providerDeleted', providerId),
  );
}
