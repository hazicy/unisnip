import { Octokit } from '@octokit/rest';
import {
  StorageProvider,
  StorageType,
  StorageEntry,
  StorageContent,
  FileSizeLimit,
  FileSizeValidation,
} from '../types/storage';
import { FILE_SIZE_LIMITS } from '../types/gist';

interface GistFile {
  filename: string;
  type: string;
  language: string;
  raw_url: string;
  size: number;
  content: string;
}

interface Gist {
  id: string;
  description: string;
  html_url: string;
  git_pull_url: string;
  git_push_url: string;
  created_at: string;
  updated_at: string;
  public: boolean;
  files: Record<string, GistFile>;
  owner?: {
    login: string;
    id: number;
    avatar_url: string;
    html_url: string;
  };
}

export class GitHubGistProvider implements StorageProvider {
  private octokit: Octokit;
  private fileSizeLimit: FileSizeLimit;

  constructor(token?: string, proxyUrl?: string) {
    this.octokit = new Octokit({
      auth: token,
    });
    this.fileSizeLimit = FILE_SIZE_LIMITS['github'];
  }

  getType(): StorageType {
    return StorageType.GitHub;
  }

  getName(): string {
    return StorageType.GitHub;
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

  private gistToEntry(gist: Gist): StorageEntry {
    const files = Object.values(gist.files);
    const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);

    return {
      id: gist.id,
      name: gist.description || gist.id,
      type: 'folder',
      path: gist.id,
      size: totalSize,
      createdAt: gist.created_at,
      updatedAt: gist.updated_at,
      metadata: {
        public: gist.public,
        files: files.map((f) => ({
          filename: f.filename,
          size: f.size,
          language: f.language,
        })),
      },
    };
  }

  private normalizePath(path: string): string {
    return path.replace(/^\/+|\/+$/g, '');
  }

  private splitPath(path: string): { gistId: string; filename?: string } {
    const normalizedPath = this.normalizePath(path);
    const [gistId, ...rest] = normalizedPath.split('/');
    return {
      gistId,
      filename: rest.length > 0 ? rest.join('/') : undefined,
    };
  }

  private fileToEntry(gist: Gist, file: GistFile): StorageEntry {
    return {
      id: `${gist.id}/${file.filename}`,
      name: file.filename,
      type: 'file',
      path: `${gist.id}/${file.filename}`,
      size: file.size || 0,
      createdAt: gist.created_at,
      updatedAt: gist.updated_at,
      metadata: {
        gistId: gist.id,
        language: file.language,
        rawUrl: file.raw_url,
      },
    };
  }

  async list(path: string): Promise<StorageEntry[]> {
    const normalizedPath = this.normalizePath(path);

    if (!normalizedPath) {
      const response = await this.octokit.gists.list();
      const gists = response.data as unknown as Gist[];
      return gists.map((gist) => this.gistToEntry(gist));
    }

    const { gistId, filename } = this.splitPath(normalizedPath);
    if (!gistId || filename) {
      return [];
    }

    const response = await this.octokit.gists.get({ gist_id: gistId });
    const gist = response.data as unknown as Gist;
    return Object.values(gist.files).map((file) =>
      this.fileToEntry(gist, file),
    );
  }

  async getEntry(path: string): Promise<StorageEntry> {
    const { gistId, filename } = this.splitPath(path);
    if (!gistId) {
      throw new Error('Entry path is required');
    }

    const response = await this.octokit.gists.get({ gist_id: gistId });
    const gist = response.data as unknown as Gist;

    if (!filename) {
      return this.gistToEntry(gist);
    }

    const file = gist.files[filename];
    if (!file) {
      throw new Error(`Entry not found: ${path}`);
    }

    return this.fileToEntry(gist, file);
  }

  async createEntry(entry: Partial<StorageEntry>): Promise<StorageEntry> {
    const path = entry.path || '';
    const { gistId, filename } = this.splitPath(path);

    if (entry.type === 'file' && gistId && filename) {
      const content = ((entry.metadata as any)?.content || '') as string;
      const updatedResponse = await this.octokit.gists.update({
        gist_id: gistId,
        files: {
          [filename]: { content },
        },
      });
      const gist = updatedResponse.data as unknown as Gist;
      const file = gist.files[filename];
      if (!file) {
        throw new Error(`Failed to create file: ${filename}`);
      }
      return this.fileToEntry(gist, file);
    }

    const response = await this.octokit.gists.create({
      description: entry.name || '',
      files: {
        [(entry.metadata as any)?.defaultFilename || 'untitled.txt']: {
          content: (entry.metadata as any)?.defaultContent || '',
        },
      },
      public: (entry.metadata as any)?.public ?? false,
    });

    return this.gistToEntry(response.data as unknown as Gist);
  }

  async updateEntry(
    id: string,
    data: Partial<StorageEntry>,
  ): Promise<StorageEntry> {
    const { gistId, filename } = this.splitPath(id);
    if (!gistId) {
      throw new Error('Entry id is required');
    }

    if (filename && data.name && data.name !== filename) {
      const gistResponse = await this.octokit.gists.get({ gist_id: gistId });
      const gist = gistResponse.data as unknown as Gist;
      const sourceFile = gist.files[filename];

      if (!sourceFile) {
        throw new Error(`Entry not found: ${id}`);
      }

      const updatedResponse = await this.octokit.gists.update({
        gist_id: gistId,
        files: {
          [data.name]: { content: sourceFile.content || '' },
          [filename]: null,
        } as any,
      });

      const updatedGist = updatedResponse.data as unknown as Gist;
      const renamed = updatedGist.files[data.name];
      if (!renamed) {
        throw new Error(`Rename failed: ${filename} -> ${data.name}`);
      }
      return this.fileToEntry(updatedGist, renamed);
    }

    const response = await this.octokit.gists.update({
      gist_id: gistId,
      description: data.name,
    });

    return this.gistToEntry(response.data as unknown as Gist);
  }

  async deleteEntry(id: string): Promise<void> {
    const { gistId, filename } = this.splitPath(id);
    if (!gistId) {
      throw new Error('Entry id is required');
    }

    if (filename) {
      await this.octokit.gists.update({
        gist_id: gistId,
        files: {
          [filename]: null,
        } as any,
      });
      return;
    }

    await this.octokit.gists.delete({ gist_id: gistId });
  }

  async readContent(id: string): Promise<StorageContent> {
    const { gistId, filename } = this.splitPath(id);
    if (!gistId) {
      throw new Error('Entry id is required');
    }

    const response = await this.octokit.gists.get({ gist_id: gistId });
    const gist = response.data as unknown as Gist;

    if (filename) {
      const file = gist.files[filename];
      if (!file) {
        throw new Error(`Entry not found: ${id}`);
      }
      return { content: file.content || '', encoding: 'utf-8' };
    }

    const files = Object.values(gist.files);

    if (files.length === 0) {
      return { content: '', encoding: 'utf-8' };
    }

    if (files.length === 1) {
      return { content: files[0].content || '', encoding: 'utf-8' };
    }

    const content: Record<string, string> = {};
    for (const file of files) {
      content[file.filename] = file.content || '';
    }

    return { content: JSON.stringify(content, null, 2), encoding: 'utf-8' };
  }

  async writeContent(id: string, content: string): Promise<StorageEntry> {
    const { gistId, filename } = this.splitPath(id);
    if (!gistId) {
      throw new Error('Entry id is required');
    }

    const response = await this.octokit.gists.get({ gist_id: gistId });
    const gist = response.data as unknown as Gist;
    const targetFilename =
      filename || Object.keys(gist.files)[0] || 'untitled.txt';

    const updatedResponse = await this.octokit.gists.update({
      gist_id: gistId,
      files: {
        [targetFilename]: { content },
      },
    });

    const updatedGist = updatedResponse.data as unknown as Gist;
    if (filename) {
      const target = updatedGist.files[targetFilename];
      if (!target) {
        throw new Error(`Entry not found: ${id}`);
      }
      return this.fileToEntry(updatedGist, target);
    }

    return this.gistToEntry(updatedGist);
  }
}
