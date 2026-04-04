import type { ExtensionContext } from 'vscode';
import { GiteeProvider } from '../../providers/gist/giteeProvider';
import { GitHubProvider } from '../../providers/gist/githubProvider';
import { GistProviderEnum } from '../../providers/gist/types';
import { GistServiceManager } from './gistManager';
import { GistService } from './gistService';

export async function createProvider(
  type: GistProviderEnum,
  token: string,
  context: ExtensionContext,
) {
  const manager = GistServiceManager.getInstance(context);

  switch (type) {
    case GistProviderEnum.GitHub:
      const githubProvider = new GitHubProvider(token);
      const githubService = new GistService(githubProvider);

      manager.registerService('github', githubService);

      break;
    case GistProviderEnum.Gitee:
      const giteeProvider = new GiteeProvider(token);
      const giteeService = new GistService(giteeProvider);

      manager.registerService('gitee', giteeService);

      break;
    default:
      throw new Error('Unsupported provider');
  }
}
