import type {
  StorageProvider,
  StorageType,
  StorageEntry,
  StorageContent,
  StorageConfig,
  FileSizeLimit,
  FileSizeValidation,
} from '../types/storage';

/**
 * 统一存储服务包装器
 * 提供对 StorageProvider 的高层封装，简化使用
 */
export class StorageService {
  private provider: StorageProvider;

  constructor(provider: StorageProvider) {
    this.provider = provider;
  }

  /**
   * 获取存储类型
   */
  getType(): StorageType {
    return this.provider.getType();
  }

  /**
   * 获取存储名称
   */
  getName(): string {
    return this.provider.getName();
  }

  /**
   * 列出目录内容
   */
  async list(path: string = ''): Promise<StorageEntry[]> {
    return this.provider.list(path);
  }

  /**
   * 获取单个条目
   */
  async getEntry(path: string): Promise<StorageEntry> {
    return this.provider.getEntry(path);
  }

  /**
   * 创建新条目
   */
  async createEntry(entry: Partial<StorageEntry>): Promise<StorageEntry> {
    return this.provider.createEntry(entry);
  }

  /**
   * 更新条目
   */
  async updateEntry(id: string, data: Partial<StorageEntry>): Promise<StorageEntry> {
    return this.provider.updateEntry(id, data);
  }

  /**
   * 删除条目
   */
  async deleteEntry(id: string): Promise<void> {
    return this.provider.deleteEntry(id);
  }

  /**
   * 读取文件内容
   */
  async readContent(id: string): Promise<StorageContent> {
    return this.provider.readContent(id);
  }

  /**
   * 写入文件内容
   */
  async writeContent(id: string, content: string): Promise<StorageEntry> {
    return this.provider.writeContent(id, content);
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
   * 获取底层 provider
   */
  getProvider(): StorageProvider {
    return this.provider;
  }
}