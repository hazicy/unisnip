// Gist types (legacy)
export type {
  Gist,
  GistFile,
  GistOwner,
  CreateGistParams,
  UpdateGistParams,
  ProviderConfig,
  GistProvider,
  FileSizeLimit as GistFileSizeLimit,
  FileSizeValidation as GistFileSizeValidation,
} from './gist';

export { GistProviderEnum, FILE_SIZE_LIMITS } from './gist';

// Storage types (new unified)
export type {
  StorageEntry,
  StorageContent,
  StorageConfig,
  FileSizeLimit,
  FileSizeValidation,
  StorageProvider,
} from './storage';

export {
  StorageType,
  GistSubType,
  DEFAULT_FILE_SIZE_LIMIT,
} from './storage';