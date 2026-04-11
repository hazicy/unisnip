import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CreateBucketCommand,
  DeleteBucketCommand,
  ListBucketsCommand,
  S3ServiceException,
} from '@aws-sdk/client-s3';
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

export class S3Provider implements StorageProvider {
  private client: S3Client;
  private bucket: string;
  private basePath: string;
  private fileSizeLimit: FileSizeLimit;

  constructor(config: StorageConfig) {
    this.bucket = config.bucket || '';
    this.basePath = config.basePath || '';

    this.client = new S3Client({
      region: config.region || 'us-east-1',
      credentials:
        config.accessKeyId && config.secretAccessKey
          ? {
              accessKeyId: config.accessKeyId,
              secretAccessKey: config.secretAccessKey,
            }
          : undefined,
      endpoint: config.endpoint,
      forcePathStyle: !!config.endpoint, // S3 兼容存储需要 path-style
    });

    this.fileSizeLimit = DEFAULT_FILE_SIZE_LIMIT;
  }

  getType(): StorageType {
    return StorageType.S3;
  }

  getName(): string {
    return this.bucket;
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
        error: `文件大小超出 S3 限制 (最大 ${maxMB}MB)`,
      };
    }

    return { valid: true };
  }

  private getFullPath(path: string): string {
    return this.basePath
      ? `${this.basePath}/${path}`.replace(/\/+/g, '/')
      : path;
  }

  private getObjectKey(path: string): string {
    const fullPath = this.getFullPath(path);
    // 移除前导斜杠
    return fullPath.replace(/^\//, '');
  }

  async list(path: string): Promise<StorageEntry[]> {
    const prefix = this.getObjectKey(path);
    // 确保 prefix 以斜杠结尾（用于列出目录内容）
    const searchPrefix = prefix ? `${prefix}/` : '';

    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: searchPrefix,
      Delimiter: '/',
    });

    const response = await this.client.send(command);

    const entries: StorageEntry[] = [];

    // 处理子目录（CommonPrefixes）
    if (response.CommonPrefixes) {
      for (const cp of response.CommonPrefixes) {
        const prefix = cp.Prefix || '';
        const name = prefix.replace(searchPrefix, '').replace(/\/$/, '');
        entries.push({
          id: prefix,
          name,
          type: 'folder',
          path: prefix.replace(this.basePath + '/', '').replace(/\/$/, ''),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    // 处理文件
    if (response.Contents) {
      for (const obj of response.Contents) {
        const key = obj.Key || '';
        // 跳过目录自己的标记
        if (key === searchPrefix.slice(0, -1)) continue;

        const name = key.replace(searchPrefix, '');
        entries.push({
          id: key,
          name,
          type: 'file',
          path: key.replace(this.basePath + '/', ''),
          size: obj.Size,
          createdAt:
            obj.LastModified?.toISOString() || new Date().toISOString(),
          updatedAt:
            obj.LastModified?.toISOString() || new Date().toISOString(),
        });
      }
    }

    return entries;
  }

  async getEntry(path: string): Promise<StorageEntry> {
    const key = this.getObjectKey(path);

    const command = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    try {
      const response = await this.client.send(command);
      const name = path.split('/').pop() || path;

      return {
        id: key,
        name,
        type: 'file',
        path,
        size: response.ContentLength,
        createdAt:
          response.LastModified?.toISOString() || new Date().toISOString(),
        updatedAt:
          response.LastModified?.toISOString() || new Date().toISOString(),
        metadata: {
          contentType: response.ContentType,
          etag: response.ETag,
        },
      };
    } catch (error) {
      // 尝试作为目录处理
      const entries = await this.list(path);
      if (entries.length > 0) {
        return {
          id: path,
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

    const key = this.getObjectKey(path);
    const content = (entry.metadata as any)?.content || '';

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: content,
      ContentType: (entry.metadata as any)?.contentType || 'text/plain',
    });

    await this.client.send(command);

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

    return this.getEntry(path);
  }

  async deleteEntry(id: string): Promise<void> {
    const key = this.getObjectKey(id);

    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.client.send(command);
  }

  async readContent(id: string): Promise<StorageContent> {
    const key = this.getObjectKey(id);

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.client.send(command);

    if (!response.Body) {
      return { content: '', encoding: 'utf-8' };
    }

    const bodyString = await response.Body.transformToString();
    return {
      content: bodyString,
      encoding: 'utf-8',
    };
  }

  async writeContent(id: string, content: string): Promise<StorageEntry> {
    const validation = this.validateFileSize(content);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const key = this.getObjectKey(id);

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: content,
      ContentType: 'text/plain',
    });

    await this.client.send(command);

    return this.getEntry(id);
  }

  // S3 特定方法
  async listBuckets(): Promise<string[]> {
    const command = new ListBucketsCommand({});
    const response = await this.client.send(command);
    return (response.Buckets || []).map((b) => b.Name || '');
  }

  async createBucket(name: string): Promise<void> {
    const command = new CreateBucketCommand({
      Bucket: name,
    });
    await this.client.send(command);
  }

  async deleteBucket(name: string): Promise<void> {
    const command = new DeleteBucketCommand({
      Bucket: name,
    });
    await this.client.send(command);
  }
}
