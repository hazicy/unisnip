import { createClient, WebDAVClient, FileStat } from 'webdav';
import {
  StorageProvider,
  StorageType,
  StorageEntry,
  StorageContent,
  StorageConfig,
  FileSizeLimit,
  FileSizeValidation,
  DEFAULT_FILE_SIZE_LIMIT,
} from '../types/storage';

export class WebDAVProvider implements StorageProvider {
  private client: WebDAVClient;
  private basePath: string;
  private fileSizeLimit: FileSizeLimit;

  constructor(config: StorageConfig) {
    if (!config.endpoint) {
      throw new Error('WebDAV endpoint is required');
    }

    this.client = createClient(config.endpoint, {
      username: config.token?.split(':')[0] || '',
      password: config.token?.split(':').slice(1).join(':') || '',
      // 如果 token 不是 username:password 格式，尝试作为 bearer token
      headers:
        config.token && !config.token.includes(':')
          ? { Authorization: `Bearer ${config.token}` }
          : undefined,
    });

    this.basePath = config.basePath || '';
    this.fileSizeLimit = DEFAULT_FILE_SIZE_LIMIT;
  }

  getType(): StorageType {
    return StorageType.WebDAV;
  }

  getName(): string {
    return this.basePath || 'WebDAV';
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
        error: `文件大小超出限制 (最大 ${maxMB}MB)`,
      };
    }

    return { valid: true };
  }

  private getFullPath(path: string): string {
    const base = this.basePath.replace(/^\/|\/$/g, '');
    const p = path.replace(/^\/|\/$/g, '');
    return base
      ? `/${base}/${p}`.replace(/\/+/g, '/')
      : `/${p}`.replace(/\/+/g, '/');
  }

  private fileStatToEntry(stat: FileStat, basePath: string): StorageEntry {
    const fullPath = stat.filename;
    const name = stat.basename;

    return {
      id: fullPath,
      name,
      type: stat.type === 'directory' ? 'folder' : 'file',
      path: fullPath.replace(basePath, '').replace(/^\//, ''),
      size: stat.size,
      createdAt: stat.lastmod
        ? new Date(stat.lastmod).toISOString()
        : new Date().toISOString(),
      updatedAt: stat.lastmod
        ? new Date(stat.lastmod).toISOString()
        : new Date().toISOString(),
    };
  }

  async list(path: string): Promise<StorageEntry[]> {
    const fullPath = this.getFullPath(path) || '/';

    const contents = await this.client.getDirectoryContents(fullPath);

    return contents.map((stat) => this.fileStatToEntry(stat, fullPath));
  }

  async getEntry(path: string): Promise<StorageEntry> {
    const fullPath = this.getFullPath(path);

    try {
      const statResult = await this.client.stat(fullPath);
      // Handle ResponseDataDetailed wrapper
      const stat = (statResult as any).data || statResult;
      return this.fileStatToEntry(stat, this.basePath);
    } catch (error) {
      // 尝试作为目录处理
      const entries = await this.list(path);
      if (entries.length > 0) {
        return {
          id: fullPath,
          name: path.split('/').pop() || path,
          type: 'folder',
          path,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      throw new Error(`Entry not found: ${path}`);
    }
  }

  async createEntry(entry: Partial<StorageEntry>): Promise<StorageEntry> {
    const path = entry.path || entry.name;
    if (!path) {
      throw new Error('Path or name is required');
    }

    const fullPath = this.getFullPath(path);

    if (entry.type === 'folder') {
      await this.client.createDirectory(fullPath);
    } else {
      const content = (entry.metadata as any)?.content || '';
      await this.client.putFileContents(fullPath, content, {
        overwrite: false,
      });
    }

    return this.getEntry(path);
  }

  async updateEntry(
    id: string,
    data: Partial<StorageEntry>,
  ): Promise<StorageEntry> {
    const path = data.path || id;
    const content = (data.metadata as any)?.content;

    if (content !== undefined) {
      return this.writeContent(id, content);
    }

    // 重命名
    if (data.name && data.name !== id.split('/').pop()) {
      const oldPath = this.getFullPath(id);
      const newPath = this.getFullPath(
        id.replace(id.split('/').pop() || '', data.name),
      );
      await this.client.moveFile(oldPath, newPath);
    }

    return this.getEntry(path);
  }

  async deleteEntry(id: string): Promise<void> {
    const fullPath = this.getFullPath(id);
    await this.client.deleteFile(fullPath);
  }

  async readContent(id: string): Promise<StorageContent> {
    const fullPath = this.getFullPath(id);

    const content = await this.client.getFileContents(fullPath, {
      format: 'text',
    });

    return {
      content: content as string,
      encoding: 'utf-8',
    };
  }

  async writeContent(id: string, content: string): Promise<StorageEntry> {
    const validation = this.validateFileSize(content);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const fullPath = this.getFullPath(id);

    await this.client.putFileContents(fullPath, content, { overwrite: true });

    return this.getEntry(id);
  }

  // WebDAV 特定方法
  async getFileStat(path: string): Promise<FileStat> {
    const fullPath = this.getFullPath(path);
    const statResult = await this.client.stat(fullPath);
    return (statResult as any).data || statResult;
  }
}
