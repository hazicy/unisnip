import { StorageConfig } from '../src/types/storage';
import { StorageService } from '../src/services/storageService';
/**
 * 创建 StorageService 实例的工厂函数
 */
export declare function createStorageService(config: StorageConfig): StorageService;
export declare const createGistService: typeof createStorageService;
