import type {
  GistProvider,
  Gist,
  CreateGistParams,
  UpdateGistParams,
  GistProviderEnum,
  FileSizeLimit,
  FileSizeValidation,
} from '../types';

/**
 * Gist 服务包装器
 * 提供对适配器模式的高层封装，简化使用
 */
export class GistService {
  private provider: GistProvider;

  constructor(provider: GistProvider) {
    this.provider = provider;
  }

  /**
   * 获取所有 Gist
   */
  async getGists(): Promise<Gist[]> {
    return this.provider.getGists();
  }

  /**
   * 获取单个 Gist
   */
  async getGist(id: string): Promise<Gist> {
    return this.provider.getGist(id);
  }

  /**
   * 创建新 Gist
   */
  async createGist(params: CreateGistParams): Promise<Gist> {
    return this.provider.createGist(params);
  }

  /**
   * 更新 Gist
   */
  async updateGist(id: string, params: UpdateGistParams): Promise<Gist> {
    return this.provider.updateGist(id, params);
  }

  /**
   * 删除 Gist
   */
  async deleteGist(id: string): Promise<void> {
    return this.provider.deleteGist(id);
  }

  /**
   * 获取 Gist 文件内容
   */
  async getGistContent(id: string, filename: string): Promise<string> {
    return this.provider.getGistContent(id, filename);
  }

  /**
   * 更新 Gist 文件内容
   */
  async updateGistContent(
    id: string,
    filename: string,
    content: string,
  ): Promise<Gist> {
    return this.provider.updateGistContent(id, filename, content);
  }

  /**
   * 删除 Gist 文件
   */
  async deleteGistFile(id: string, filename: string): Promise<Gist> {
    return this.provider.deleteGistFile(id, filename);
  }

  /**
   * 获取当前服务提供商名称
   */
  getProviderName(): GistProviderEnum {
    return this.provider.getProviderName();
  }

  /**
   * 获取文件大小限制
   */
  getFileSizeLimit(): FileSizeLimit {
    return this.provider.getFileSizeLimit();
  }

  /**
   * 验证文件大小
   */
  validateFileSize(content: string, filename?: string): FileSizeValidation {
    return this.provider.validateFileSize(content, filename);
  }

  /**
   * 上传文件到 Gist
   */
  async uploadFile(
    id: string,
    filename: string,
    content: string,
    onProgress?: (progress: number) => void,
  ): Promise<Gist> {
    return this.provider.uploadFile(id, filename, content, onProgress);
  }
}