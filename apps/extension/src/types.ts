import type { StorageConfig } from '@gisthub/core';

/**
 * Extension provider config persisted in VS Code globalState.
 * Extends core StorageConfig with local management fields.
 */
export interface ProviderConfig extends StorageConfig {
  id: string;
  enabled?: boolean;
}
