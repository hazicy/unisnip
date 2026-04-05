import { Octokit } from '@octokit/rest';
import {
  GistProvider,
  Gist,
  CreateGistParams,
  UpdateGistParams,
  GistProviderEnum,
  FileSizeLimit,
  FileSizeValidation,
  FILE_SIZE_LIMITS,
} from '../types';

export class GitHubProvider implements GistProvider {
  private octokit: Octokit;
  private fileSizeLimit: FileSizeLimit;

  constructor(token?: string, proxyUrl?: string) {
    this.octokit = new Octokit({
      auth: token,
    });
    this.fileSizeLimit = FILE_SIZE_LIMITS[GistProviderEnum.GitHub];
  }

  getProviderName(): GistProviderEnum {
    return GistProviderEnum.GitHub;
  }

  getFileSizeLimit(): FileSizeLimit {
    return this.fileSizeLimit;
  }

  validateFileSize(content: string, filename?: string): FileSizeValidation {
    const byteSize = new Blob([content]).size;

    if (byteSize > this.fileSizeLimit.maxFileSize) {
      const maxMB = (this.fileSizeLimit.maxFileSize / (1024 * 1024)).toFixed(0);
      return {
        valid: false,
        error: `文件大小超出 GitHub 限制 (最大 ${maxMB}MB)`,
      };
    }

    return { valid: true };
  }

  async uploadFile(
    id: string,
    filename: string,
    content: string,
    onProgress?: (progress: number) => void,
  ): Promise<Gist> {
    const validation = this.validateFileSize(content, filename);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    onProgress?.(100);
    return this.updateGistContent(id, filename, content);
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