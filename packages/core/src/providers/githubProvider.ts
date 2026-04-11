import { Octokit } from '@octokit/rest';
import {
  StorageProvider,
  StorageType,
  StorageEntry,
  StorageContent,
  GistSubType,
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
    return StorageType.Gist;
  }

  getName(): string {
    return GistSubType.GitHub;
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

  async list(path: string): Promise<StorageEntry[]> {
    const response = await this.octokit.gists.list();
    const gists = response.data as unknown as Gist[];
    return gists.map((gist) => this.gistToEntry(gist));
  }

  async getEntry(path: string): Promise<StorageEntry> {
    const response = await this.octokit.gists.get({ gist_id: path });
    const gist = response.data as unknown as Gist;
    return this.gistToEntry(gist);
  }

  async createEntry(entry: Partial<StorageEntry>): Promise<StorageEntry> {
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
    const response = await this.octokit.gists.update({
      gist_id: id,
      description: data.name,
    });

    return this.gistToEntry(response.data as unknown as Gist);
  }

  async deleteEntry(id: string): Promise<void> {
    await this.octokit.gists.delete({ gist_id: id });
  }

  async readContent(id: string): Promise<StorageContent> {
    const response = await this.octokit.gists.get({ gist_id: id });
    const gist = response.data as unknown as Gist;
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
    const response = await this.octokit.gists.get({ gist_id: id });
    const gist = response.data as unknown as Gist;
    const files = Object.keys(gist.files);
    const filename = files[0] || 'untitled.txt';

    const updatedResponse = await this.octokit.gists.update({
      gist_id: id,
      files: {
        [filename]: { content },
      },
    });

    return this.gistToEntry(updatedResponse.data as unknown as Gist);
  }
}