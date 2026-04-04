import axios from 'axios';
import {
  GistProvider,
  Gist,
  CreateGistParams,
  UpdateGistParams,
  GistProviderEnum,
} from './types';
import type { GistObject } from '../../api/gitee/type';

const giteeBaseURL = 'https://gitee.com/api/v5';

/**
 * Gitee Gist 适配器
 * 实现了通用 GistAdapter 接口，适配 Gitee API
 */
export class GiteeProvider implements GistProvider {
  private axiosInstance;

  constructor(token?: string) {
    this.axiosInstance = axios.create({
      baseURL: giteeBaseURL,
      params: {
        access_token: token,
      },
    });
  }

  getProviderName(): GistProviderEnum {
    return GistProviderEnum.Gitee;
  }

  async getGists(): Promise<Gist[]> {
    const response = await this.axiosInstance.get<GistObject[]>('/gists', {
      params: {
        page: 1,
        per_page: 100,
      },
    });

    return response.data.map(this.convertToStandardGist);
  }

  async getStarredGists(): Promise<Gist[]> {
    // Gitee API 可能不支持直接获取星标的 Gist
    // 暂时返回空数组，或者需要实现其他逻辑
    return [];
  }

  async getGist(id: string): Promise<Gist> {
    const response = await this.axiosInstance.get<GistObject>(`/gists/${id}`);
    return this.convertToStandardGist(response.data);
  }

  async createGist(params: CreateGistParams): Promise<Gist> {
    const response = await this.axiosInstance.post<GistObject>('/gists', {
      description: params.description,
      files: params.files,
      public: params.public,
    });
    return this.convertToStandardGist(response.data);
  }

  async updateGist(id: string, params: UpdateGistParams): Promise<Gist> {
    const response = await this.axiosInstance.patch<GistObject>(
      `/gists/${id}`,
      params,
    );
    return this.convertToStandardGist(response.data);
  }

  async deleteGist(id: string): Promise<void> {
    await this.axiosInstance.delete(`/gists/${id}`);
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

  /**
   * 将 Gitee API 响应转换为标准 Gist 格式
   */
  private convertToStandardGist(giteeGist: GistObject): Gist {
    const files: Record<string, any> = {};

    if (giteeGist.files) {
      Object.entries(giteeGist.files).forEach(
        ([filename, fileData]: [string, any]) => {
          files[filename] = {
            filename: filename,
            type: fileData.type || 'text/plain',
            language: fileData.language || 'plaintext',
            raw_url: fileData.raw_url,
            size: fileData.size || 0,
            content: fileData.content || '',
          };
        },
      );
    }

    return {
      id: giteeGist.id!,
      description: giteeGist.description || '',
      html_url: giteeGist.html_url!,
      git_pull_url: giteeGist.git_pull_url!,
      git_push_url: giteeGist.git_push_url!,
      created_at: giteeGist.created_at!,
      updated_at: giteeGist.updated_at!,
      public: giteeGist.public!,
      files,
      owner: giteeGist.owner
        ? {
            login: giteeGist.owner.login!,
            id: giteeGist.owner.id!,
            avatar_url: giteeGist.owner.avatar_url!,
            html_url: giteeGist.owner.html_url!,
          }
        : undefined,
    };
  }
}
