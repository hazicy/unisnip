import * as vscode from 'vscode';
import type { GistService } from '../../services/gist/gistService';

/**
 * Gist 服务通用接口 - 适配器模式的目标接口
 */
export interface GistProvider {
  /**
   * 获取用户的所有 Gist
   */
  getGists(): Promise<Gist[]>;

  /**
   * 获取用户星标的 Gist
   */
  getStarredGists(): Promise<Gist[]>;

  /**
   * 根据 ID 获取单个 Gist 详情
   */
  getGist(id: string): Promise<Gist>;

  /**
   * 创建新的 Gist
   */
  createGist(params: CreateGistParams): Promise<Gist>;

  /**
   * 更新 Gist
   */
  updateGist(id: string, params: UpdateGistParams): Promise<Gist>;

  /**
   * 删除 Gist
   */
  deleteGist(id: string): Promise<void>;

  /**
   * 获取 Gist 的文件内容
   */
  getGistContent(id: string, filename: string): Promise<string>;

  /**
   * 更新 Gist 文件内容
   */
  updateGistContent(
    id: string,
    filename: string,
    content: string,
  ): Promise<Gist>;

  /**
   * 删除 Gist 文件
   */
  deleteGistFile(id: string, filename: string): Promise<Gist>;

  /**
   * 获取服务提供商名称
   */
  getProviderName(): GistProviderEnum;
}

/**
 * Gist 数据结构
 */
export interface Gist {
  id: string;
  description: string;
  html_url: string;
  git_pull_url: string;
  git_push_url: string;
  created_at: string;
  updated_at: string;
  public: boolean;
  files: Record<string, GistFile>;
  owner?: GistOwner;
}

/**
 * Gist 文件结构
 */
export interface GistFile {
  filename: string;
  type: string;
  language: string;
  raw_url: string;
  size: number;
  content: string;
}

/**
 * Gist 所有者信息
 */
export interface GistOwner {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
}

/**
 * 创建 Gist 参数
 */
export interface CreateGistParams {
  description: string;
  files: Record<string, { content: string }>;
  public: boolean;
}

/**
 * 更新 Gist 参数
 */
export interface UpdateGistParams {
  description?: string;
  files?: Record<string, { content?: string; filename?: string } | null>;
}

/**
 * Gist 服务类型
 */
export enum GistProviderEnum {
  GitHub = 'github',
  Gitee = 'gitee',
}

export interface ProviderConfig {
  id: string;
  provider?: GistProviderEnum;
  enabled?: boolean;
}

/**
 * 星标 Gist 树形项数据类型
 */
export type StarGistTreeItem = {
  gist?: Gist;
} & vscode.TreeItem;
