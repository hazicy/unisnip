import axios from 'axios';
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

interface GiteeGistObject {
  url?: string;
  forks_url?: string;
  commits_url?: string;
  id?: string;
  description?: string;
  public?: boolean;
  owner?: GiteeOwner;
  user?: GiteeOwner;
  files?: Record<string, any>;
  truncated?: boolean;
  html_url?: string;
  comments?: number;
  comments_url?: string;
  git_pull_url?: string;
  git_push_url?: string;
  created_at?: string;
  updated_at?: string;
  forks?: string;
  history?: string;
}

interface GiteeOwner {
  id?: number;
  login?: string;
  name?: string;
  avatar_url?: string;
  url?: string;
  html_url?: string;
}

const giteeBaseURL = 'https://gitee.com/api/v5';

export class GiteeGistProvider implements StorageProvider {
  private axiosInstance;
  private fileSizeLimit: FileSizeLimit;

  constructor(token?: string) {
    this.axiosInstance = axios.create({
      baseURL: giteeBaseURL,
      params: {
        access_token: token,
      },
      timeout: 10000,
    });
    this.fileSizeLimit = FILE_SIZE_LIMITS['gitee'];
  }

  getType(): StorageType {
    return StorageType.Gist;
  }

  getName(): string {
    return GistSubType.Gitee;
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
        error: `文件大小超出 Gitee 限制 (最大 ${maxMB}MB)`,
      };
    }

    return { valid: true };
  }

  private convertToStandardGist(giteeGist: GiteeGistObject): Gist {
    const files: Record<string, GistFile> = {};

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
    const response = await this.axiosInstance.get<GiteeGistObject[]>('/gists', {
      params: {
        page: 1,
        per_page: 100,
      },
    });

    return response.data.map((g) =>
      this.gistToEntry(this.convertToStandardGist(g)),
    );
  }

  async getEntry(path: string): Promise<StorageEntry> {
    const response = await this.axiosInstance.get<GiteeGistObject>(
      `/gists/${path}`,
    );
    return this.gistToEntry(this.convertToStandardGist(response.data));
  }

  async createEntry(entry: Partial<StorageEntry>): Promise<StorageEntry> {
    const response = await this.axiosInstance.post<GiteeGistObject>('/gists', {
      description: entry.name || '',
      files: {
        [(entry.metadata as any)?.defaultFilename || 'untitled.txt']: {
          content: (entry.metadata as any)?.defaultContent || '',
        },
      },
      public: (entry.metadata as any)?.public ?? false,
    });

    return this.gistToEntry(this.convertToStandardGist(response.data));
  }

  async updateEntry(
    id: string,
    data: Partial<StorageEntry>,
  ): Promise<StorageEntry> {
    const response = await this.axiosInstance.patch<GiteeGistObject>(
      `/gists/${id}`,
      { description: data.name },
    );

    return this.gistToEntry(this.convertToStandardGist(response.data));
  }

  async deleteEntry(id: string): Promise<void> {
    await this.axiosInstance.delete(`/gists/${id}`);
  }

  async readContent(id: string): Promise<StorageContent> {
    const response = await this.axiosInstance.get<GiteeGistObject>(
      `/gists/${id}`,
    );
    const gist = this.convertToStandardGist(response.data);
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
    const response = await this.axiosInstance.get<GiteeGistObject>(
      `/gists/${id}`,
    );
    const gist = this.convertToStandardGist(response.data);
    const files = Object.keys(gist.files);
    const filename = files[0] || 'untitled.txt';

    const updatedResponse = await this.axiosInstance.patch<GiteeGistObject>(
      `/gists/${id}`,
      {
        files: {
          [filename]: { content },
        },
      },
    );

    return this.gistToEntry(this.convertToStandardGist(updatedResponse.data));
  }
}