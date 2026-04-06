import * as vscode from 'vscode';
import {
  GistProviderEnum,
  type ProviderConfig,
} from '@gisthub/core';
import { loadServices, saveService } from '../../store/serviceStorage';
import { GistService } from '@gisthub/core';
import { GitHubProvider } from '../../providers/gist/githubProvider';
import { getGiteeAccessToken, getGithubAccessToken } from '../authService';
import { GiteeProvider } from '../../providers/gist/giteeProvider';

export class GistServiceManager {
  private services = new Map<string, GistService>();
  private configs: ProviderConfig[] = [];
  private static instance: GistServiceManager;

  activeServiceId?: string;

  constructor(public readonly context: vscode.ExtensionContext) {}

  static getInstance(context: vscode.ExtensionContext) {
    if (!this.instance) {
      this.instance = new GistServiceManager(context);
    }

    return this.instance;
  }

  async init() {
    const saved = loadServices(this.context);

    for (const save of saved) {
      if (save.provider === GistProviderEnum.GitHub) {
        const token = await getGithubAccessToken();
        const githubProvider = new GitHubProvider(token);
        const service = new GistService(githubProvider);
        this.services.set(save.id, service);
      } else if (save.provider === GistProviderEnum.Gitee) {
        const token = await getGiteeAccessToken();
        const giteeProvider = new GiteeProvider(token);
        const service = new GistService(giteeProvider);
        this.services.set(save.id, service);
      }
    }

    this.configs = saved;
  }

  registerService(id: string, service: GistService) {
    this.services.set(id, service);
    this.configs.push({
      id,
      provider: service.getProviderName(),
      enabled: true,
    });

    saveService(this.context, this.configs);
  }

  getService(id: string) {
    return this.services.get(id);
  }

  getAllServices(): Array<[string, GistService]> {
    return Array.from(this.services.entries());
  }

  getConfig() {
    return [...this.configs];
  }

  removeService(id: string) {
    this.services.delete(id);
    this.configs = this.configs.filter((c) => c.id !== id);
    saveService(this.context, this.configs);
  }
}