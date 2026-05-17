import * as vscode from 'vscode';
import {
  createStorageService,
  type StorageConfig,
  type StorageService,
  StorageType,
} from '@gisthub/core';
import { loadServices, saveService } from '../store/serviceStorage';
import type { ProviderConfig } from '../types';

export class StorageServiceManager {
  private services = new Map<string, StorageService>();
  private configs: ProviderConfig[] = [];
  private static instance: StorageServiceManager;

  activeServiceId?: string;

  constructor(public readonly context: vscode.ExtensionContext) {}

  static getInstance(context: vscode.ExtensionContext) {
    if (!this.instance) {
      this.instance = new StorageServiceManager(context);
    }

    return this.instance;
  }

  private normalizeLegacyConfig(config: ProviderConfig): ProviderConfig {
    return config;
  }

  private async hydrateConfig(config: ProviderConfig): Promise<StorageConfig> {
    const normalized = this.normalizeLegacyConfig(config);

    return normalized;
  }

  async init() {
    const saved = loadServices(this.context);
    const normalizedSaved = saved.map((config) =>
      this.normalizeLegacyConfig(config),
    );

    for (const config of normalizedSaved) {
      try {
        const hydratedConfig = await this.hydrateConfig(config);
        const service = createStorageService(hydratedConfig);
        this.services.set(config.id, service);
      } catch (error) {
        console.error(`Failed to initialize provider ${config.id}:`, error);
      }
    }

    this.configs = normalizedSaved;
  }

  async registerService(id: string, config: ProviderConfig) {
    const hydratedConfig = await this.hydrateConfig(config);
    const service = createStorageService(hydratedConfig);

    const existingIndex = this.configs.findIndex((c) => c.id === id);

    this.services.set(id, service);

    const normalizedConfig: ProviderConfig = {
      ...config,
      id,
      enabled: config.enabled ?? true,
    };

    if (existingIndex >= 0) {
      this.configs[existingIndex] = normalizedConfig;
    } else {
      this.configs.push(normalizedConfig);
    }

    await saveService(this.context, this.configs);
  }

  getService(id: string) {
    return this.services.get(id);
  }

  getAllServices(): Array<[string, StorageService]> {
    return Array.from(this.services.entries());
  }

  getConfig() {
    return [...this.configs];
  }

  async removeService(id: string) {
    this.services.delete(id);
    this.configs = this.configs.filter((c) => c.id !== id);
    await saveService(this.context, this.configs);
  }
}
