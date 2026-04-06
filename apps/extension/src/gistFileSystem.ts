import * as vscode from 'vscode';
import type { GistServiceManager } from './services/gist/gistManager';

/**
 * Gist 文件系统提供者
 * 使用适配器模式支持多种 Gist 服务提供商
 */
export class GistFileSystemProvider implements vscode.FileSystemProvider {
  private readonly eventEmitter = new vscode.EventEmitter<
    vscode.FileChangeEvent[]
  >();
  private readonly manager: GistServiceManager;

  public readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> =
    this.eventEmitter.event;

  constructor(provider: GistServiceManager) {
    this.manager = provider;
  }

  /**
   * 监视文件变化（当前未实现）
   */
  watch(
    _uri: vscode.Uri,
    _options: {
      readonly recursive: boolean;
      readonly excludes: readonly string[];
    },
  ): vscode.Disposable {
    return {
      dispose: () => {},
    };
  }

  /**
   * 获取文件状态
   */
  stat(_uri: vscode.Uri): vscode.FileStat | Thenable<vscode.FileStat> {
    return {
      type: vscode.FileType.File,
      ctime: 0,
      mtime: Date.now(),
      size: 0,
    };
  }

  /**
   * 读取目录（Gist 不支持真实文件夹）
   */
  readDirectory(
    _uri: vscode.Uri,
  ): [string, vscode.FileType][] | Thenable<[string, vscode.FileType][]> {
    return [];
  }

  /**
   * 创建目录（Gist 不支持真实文件夹）
   */
  createDirectory(_uri: vscode.Uri): void | Thenable<void> {
    // Gist 不支持真实文件夹
  }

  /**
   * 读取文件内容
   */
  async readFile(uri: vscode.Uri): Promise<Uint8Array> {
    try {
      const { gistId, filename, providerId } = this.parseUri(uri);
      const provider = this.manager.getService(providerId);

      if (!provider) {
        throw vscode.FileSystemError.FileNotFound(uri);
      }

      const content = await provider.getGistContent(gistId, filename);

      if (!content) {
        throw vscode.FileSystemError.FileNotFound();
      }

      return new TextEncoder().encode(content);
    } catch (e) {
      if (e instanceof vscode.FileSystemError) {
        throw e;
      }
      throw vscode.FileSystemError.FileNotFound(uri);
    }
  }

  /**
   * 写入文件内容
   */
  async writeFile(
    uri: vscode.Uri,
    content: Uint8Array,
    options: { readonly create: boolean; readonly overwrite: boolean },
  ): Promise<void> {
    const { gistId, filename, providerId } = this.parseUri(uri);
    const provider = this.manager.getService(providerId);
    const contentStr = new TextDecoder().decode(content);

    if (!provider) {
      throw vscode.FileSystemError.FileNotFound(uri);
    }

    if (options.create && !options.overwrite) {
      // 创建新 Gist
      await provider.createGist({
        description: vscode.l10n.t('newGist'),
        public: false,
        files: { [filename]: { content: contentStr } },
      });
      return;
    }

    if (options.create && options.overwrite) {
      // 更新已存在的 Gist 文件
      await provider.updateGistContent(gistId, filename, contentStr);
      return;
    }

    this.notifyFileChanged(uri, vscode.FileChangeType.Changed);
  }

  /**
   * 删除文件
   */
  async delete(
    uri: vscode.Uri,
    _options: { readonly recursive: boolean },
  ): Promise<void> {
    const { gistId, filename, providerId } = this.parseUri(uri);

    const provider = this.manager.getService(providerId);

    if (!provider) {
      throw vscode.FileSystemError.FileNotFound(uri);
    }

    // 如果有 filename，说明是删除文件；否则删除整个 Gist
    if (filename) {
      await provider.deleteGistFile(gistId, filename);
    } else {
      await provider.deleteGist(gistId);
    }

    this.notifyFileChanged(uri, vscode.FileChangeType.Deleted);
  }

  /**
   * 重命名文件
   */
  async rename(
    oldUri: vscode.Uri,
    newUri: vscode.Uri,
    _options: { readonly overwrite: boolean },
  ): Promise<void> {
    const { gistId, filename: oldFilename, providerId } = this.parseUri(oldUri);
    const provider = this.manager.getService(providerId);

    if (!provider) {
      throw vscode.FileSystemError.FileNotFound(oldUri);
    }

    const { filename: newFilename } = this.parseUri(newUri);

    // 获取原文件内容
    const content = await provider.getGistContent(gistId, oldFilename);

    // 更新 Gist：删除旧文件，添加新文件
    await provider.updateGist(gistId, {
      files: {
        [oldFilename]: null,
        [newFilename]: {
          content,
        },
      },
    });

    this.notifyFileChanged(oldUri, vscode.FileChangeType.Deleted);
    this.notifyFileChanged(newUri, vscode.FileChangeType.Created);
  }

  /**
   * 复制文件
   */
  async copy(
    source: vscode.Uri,
    destination: vscode.Uri,
    _options: { readonly overwrite: boolean },
  ): Promise<void> {
    const {
      gistId: sourceGistId,
      filename: sourceFilename,
      providerId,
    } = this.parseUri(source);
    const provider = this.manager.getService(providerId);

    if (!provider) {
      throw vscode.FileSystemError.FileNotFound(source);
    }

    const { gistId: destGistId, filename: destFilename } =
      this.parseUri(destination);

    const content = await provider.getGistContent(
      sourceGistId,
      sourceFilename,
    );

    if (sourceGistId === destGistId) {
      // 同一 Gist 内复制
      await provider.updateGist(sourceGistId, {
        files: {
          [destFilename]: {
            content,
          },
        },
      });
    } else {
      // 跨 Gist 复制
      await provider.updateGistContent(
        destGistId,
        destFilename,
        content ?? '',
      );
    }

    this.notifyFileChanged(destination, vscode.FileChangeType.Created);
  }

  /**
   * 解析 URI 获取 Gist ID 和文件名
   */
  private parseUri(uri: vscode.Uri): {
    gistId: string;
    filename: string;
    providerId: string;
  } {
    // URI 格式: gisthub://providerId/filename

    const providerId = uri.authority;
    const filename = uri.path.startsWith('/') ? uri.path.slice(1) : uri.path;
    const params = new URLSearchParams(uri.query);
    const gistId = params.get('id');

    if (!gistId) {
      throw new Error(vscode.l10n.t('invalidGistUri'));
    }

    return { gistId, filename, providerId };
  }

  /**
   * 通知文件变化
   */
  private notifyFileChanged(
    uri: vscode.Uri,
    type: vscode.FileChangeType,
  ): void {
    this.eventEmitter.fire([{ uri, type }]);
  }
}
