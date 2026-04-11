import { StorageType, GistSubType, StorageConfig } from '../types/storage';
import { GitHubProvider, GiteeProvider } from '../providers';
import { S3Provider } from '../providers/s3Provider';
import { WebDAVProvider } from '../providers/webdavProvider';
import { StorageService } from './storageService';

/**
 * 创建 StorageService 实例的工厂函数
 */
export function createStorageService(config: StorageConfig): StorageService {
  const { type, subType, ...rest } = config;

  switch (type) {
    case StorageType.Gist:
      switch (subType) {
        case GistSubType.GitHub:
          return new StorageService(
            new GitHubProvider(rest.token, rest.proxyUrl),
          );
        case GistSubType.Gitee:
          return new StorageService(new GiteeProvider(rest.token));
        default:
          throw new Error(
            `Invalid gist subtype: ${subType}. Required: ${GistSubType.GitHub} or ${GistSubType.Gitee}`,
          );
      }

    case StorageType.S3:
      if (!config.bucket) {
        throw new Error('S3 bucket is required');
      }
      return new StorageService(new S3Provider(config));

    case StorageType.WebDAV:
      if (!config.endpoint) {
        throw new Error('WebDAV endpoint is required');
      }
      return new StorageService(new WebDAVProvider(config));

    default:
      throw new Error(`Unsupported storage type: ${type}`);
  }
}

// 保留向后兼容的别名
export const createGistService = createStorageService;