import { Octokit } from '@octokit/rest';
import * as vscode from 'vscode';
import {
  GistProvider,
  Gist,
  CreateGistParams,
  UpdateGistParams,
  GistProviderEnum,
} from './types';

function getGitHubApiProxy(): string | null {
  const customUrl = vscode.workspace
    .getConfiguration('gisthub')
    .get<string>('githubApiProxy', '');
  return customUrl || null;
}

export class GitHubProvider implements GistProvider {
  private octokit: Octokit;

  constructor(token?: string) {
    const proxyUrl = getGitHubApiProxy();

    this.octokit = new Octokit({
      auth: token,
    });
  }

  getProviderName(): GistProviderEnum {
    return GistProviderEnum.GitHub;
  }

  async getGists(): Promise<Gist[]> {
    const response = await this.octokit.gists.list();
    return response.data as unknown as Gist[];
  }

  async getStarredGists(): Promise<Gist[]> {
    const response = await this.octokit.gists.listStarred();
    return response.data as unknown as Gist[];
  }

  async getGist(id: string): Promise<Gist> {
    const response = await this.octokit.gists.get({ gist_id: id });
    return response.data as unknown as Gist;
  }

  async createGist(params: CreateGistParams): Promise<Gist> {
    const response = await this.octokit.gists.create({
      description: params.description,
      files: params.files,
      public: params.public,
    });
    return response.data as unknown as Gist;
  }

  async updateGist(id: string, params: UpdateGistParams): Promise<Gist> {
    const response = await this.octokit.gists.update({
      gist_id: id,
      description: params.description,
      files: params.files as any,
    });
    return response.data as unknown as Gist;
  }

  async deleteGist(id: string): Promise<void> {
    await this.octokit.gists.delete({ gist_id: id });
  }

  async getGistContent(id: string, filename: string): Promise<string> {
    const gist = await this.getGist(id);
    const file = gist.files[filename];
    if (!file) {
      throw new Error(`File "${filename}" not found in Gist`);
    }
    return file.content || '';
  }

  async updateGistContent(
    id: string,
    filename: string,
    content: string,
  ): Promise<Gist> {
    return this.updateGist(id, {
      files: {
        [filename]: {
          content,
        },
      },
    });
  }

  async deleteGistFile(id: string, filename: string): Promise<Gist> {
    return this.updateGist(id, {
      files: {
        [filename]: null,
      },
    });
  }
}
