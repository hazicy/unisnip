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
): Promise<void> {
  const configs = gistManager.getConfig();

  if (configs.length === 0) {
    await handleAddProvider(context);
    return;
  }

  await handleManageProviders(configs, context, gistManager);
}

async function handleAddProvider(
  context: vscode.ExtensionContext,
): Promise<void> {
  const pick = await vscode.window.showQuickPick(PROVIDER_OPTIONS, {
    placeHolder: vscode.l10n.t('noActiveProviders'),
  });

  if (!pick) {
    return;
  }

  const getToken = PROVIDER_TOKEN_GETTERS[pick.value];
  const token = await getToken();
  await createProvider(pick.value, token, context);
}

type ProviderAction = 'edit' | 'delete' | 'add';

interface ProviderQuickPickItem extends vscode.QuickPickItem {
  action: ProviderAction;
  providerId?: string;
}

async function handleManageProviders(
  configs: ProviderConfig[],
  context: vscode.ExtensionContext,
  gistManager: GistServiceManager,
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
    await handleAddProvider(context);
    return;
  }

  // 第二级：选择操作
  const actionItems: ProviderQuickPickItem[] = [
    {
      label: '$(edit) Edit',
      description: selectedProvider.config.id,
      action: 'edit',
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

  await executeProviderAction(selectedAction, context, gistManager);
}

async function executeProviderAction(
  item: ProviderQuickPickItem,
  context: vscode.ExtensionContext,
  gistManager: GistServiceManager,
): Promise<void> {
  switch (item.action) {
    case 'add':
      await handleAddProvider(context);
      break;
    case 'edit':
      if (item.providerId) {
        await editProvider(item.providerId, context);
      }
      break;
    case 'delete':
      if (item.providerId) {
        await deleteProvider(item.providerId, context, gistManager);
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

  const token = await vscode.window.showInputBox({
    prompt:
      type === GistProviderEnum.GitHub
        ? 'Enter your GitHub access token'
        : 'Enter your Gitee access token',
    password: true,
    placeHolder:
      type === GistProviderEnum.GitHub ? 'ghp_xxxxxxxx' : 'access_token',
  });

  if (token === undefined) {
    return;
  }

  await createProvider(type, token, gistManager.context);

  vscode.window.showInformationMessage(vscode.l10n.t('gistUpdated'));
}

async function editProvider(
  providerId: string,
  context: vscode.ExtensionContext,
): Promise<void> {
  const isGitee = providerId.toLowerCase().includes('gitee');

  const token = await vscode.window.showInputBox({
    prompt: isGitee
      ? 'Enter your Gitee access token'
      : 'Enter your GitHub access token',
    password: true,
    placeHolder: isGitee ? 'access_token' : 'ghp_xxxxxxxx',
  });

  if (token === undefined) {
    return;
  }

  const providerType = isGitee
    ? GistProviderEnum.Gitee
    : GistProviderEnum.GitHub;

  await createProvider(providerType, token, context);

  vscode.window.showInformationMessage(vscode.l10n.t('gistUpdated'));
}

async function deleteProvider(
  providerId: string,
  _context: vscode.ExtensionContext,
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
