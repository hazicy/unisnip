import * as vscode from 'vscode';
import type { GistServiceManager } from '../../services/gist/gistManager';
import {
  EmptyNode,
  ErrorNode,
  GistFileNode,
  GistFolderNode,
  type GistTreeItem,
} from './treeItem';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL = 30 * 1000;

export class GistTreeProvider implements vscode.TreeDataProvider<GistTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<
    GistTreeItem | undefined | null | void
  >();
  private cache = new Map<string, CacheEntry<unknown>>();
  private cacheTimer?: ReturnType<typeof setInterval>;

  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private readonly gistManager: GistServiceManager) {
    this.cacheTimer = setInterval(() => this.cleanCache(), CACHE_TTL);
  }

  dispose(): void {
    if (this.cacheTimer) {
      clearInterval(this.cacheTimer);
      this.cacheTimer = undefined;
    }
    this.cache.clear();
    this._onDidChangeTreeData.dispose();
  }

  getTreeItem(element: GistTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: GistTreeItem): Promise<GistTreeItem[]> {
    try {
      if (!element) {
        return await this.getAllGistItems();
      }
      if (element instanceof GistFolderNode) {
        return await this.getFileItems(element);
      }
      return [];
    } catch (error) {
      return [new ErrorNode(vscode.l10n.t('errorFetchingGists'))];
    }
  }

  private getCached<T>(key: string): T | undefined {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
      return entry.data;
    }
    return undefined;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private cleanCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp >= CACHE_TTL) {
        this.cache.delete(key);
      }
    }
  }

  private async getAllGistItems(): Promise<GistTreeItem[]> {
    const providers = this.gistManager.getAllServices();

    if (providers.length === 0) {
      return [new EmptyNode(vscode.l10n.t('noActiveProviders'))];
    }

    const cacheKey = 'allGists';
    const cached = this.getCached<GistTreeItem[]>(cacheKey);
    if (cached) return cached;

    // 并行获取所有 provider 的 Gist
    const gistsResults = await Promise.all(
      providers.map(async ([providerId, provider]) => {
        try {
          const gists = await provider.getGists();
          return gists.map((gist) => new GistFolderNode(gist, providerId));
        } catch (error) {
          console.error(`Error fetching gists from ${providerId}:`, error);
          return [];
        }
      }),
    );

    // 扁平化结果
    const items = gistsResults.flat();

    this.setCache(cacheKey, items);
    return items;
  }

  private async getFileItems(element: GistFolderNode): Promise<GistTreeItem[]> {
    const service = this.gistManager.getService(element.providerId);
    if (!service) return [];

    const cacheKey = `gist:${element.providerId}:${element.gist.id}`;
    const cached = this.getCached<GistTreeItem[]>(cacheKey);
    if (cached) return cached;

    const gist = await service.getGist(element.gist.id);
    if (!gist) return [];

    const items = Object.keys(gist.files ?? {}).map(
      (filename) => new GistFileNode(filename, gist.id, element.providerId),
    );

    this.setCache(cacheKey, items);
    return items;
  }

  refresh(): void {
    this.cache.clear();
    this._onDidChangeTreeData.fire();
  }
}
