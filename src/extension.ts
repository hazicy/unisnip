import * as vscode from 'vscode';
import { registerAllCommands } from './commands';
import { GistFileSystemProvider } from './gistFileSystem';
import { GistServiceManager } from './services/gist/gistManager';
import { GistTreeProvider } from './views/tree/gistTreeData';
import { GiteeAuthenticationProvider } from './giteeAuth';

export const SCHEMA = 'gisthub';

export async function activate(context: vscode.ExtensionContext) {
  const giteeAuthProvider = new GiteeAuthenticationProvider(context);

  context.subscriptions.push(
    vscode.authentication.registerAuthenticationProvider(
      'gitee',
      'Gitee',
      giteeAuthProvider,
      {
        supportsMultipleAccounts: false,
      },
    ),
  );

  // 初始化 adapter manager
  const gistManager = GistServiceManager.getInstance(context);
  await gistManager.init();

  // 创建树状图提供者
  const gistProvider = new GistTreeProvider(gistManager);

  // 注册树状图提供者
  vscode.window.registerTreeDataProvider('gistView', gistProvider);

  // 注册文件系统提供者
  const fileSystemDisposable = vscode.workspace.registerFileSystemProvider(
    SCHEMA,
    new GistFileSystemProvider(gistManager),
  );

  // 刷新回调函数
  const refreshCallback = () => {
    gistProvider?.refresh();
  };

  // 注册刷新命令
  const refreshCommand = vscode.commands.registerCommand(
    'gisthub.refresh',
    () => {
      vscode.window.withProgress(
        {
          location: {
            viewId: 'gistView',
          },
          title: vscode.l10n.t('loadingGists'),
        },
        async () => {
          refreshCallback();
        },
      );
    },
  );

  // 注册所有其他命令
  const commandDisposables = registerAllCommands(
    gistManager,
    refreshCallback,
    context,
  );

  // 保存所有 disposables
  context.subscriptions.push(
    fileSystemDisposable,
    refreshCommand,
    ...commandDisposables,
  );

  // 初始刷新
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Window,
      title: vscode.l10n.t('loadingGists'),
    },
    async () => {
      refreshCallback();
    },
  );
}

export function deactivate() {
  console.log('GistHub extension deactivated');
}
