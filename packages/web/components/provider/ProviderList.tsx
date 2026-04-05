'use client';

import { useState, useRef } from 'react';
import { Card, Avatar, Button, Chip, Input } from '@heroui/react';
import { toast } from '@heroui/react';
import { useGistStore } from '@/stores/useGistStore';
import type { GistProvider, GistProviderType } from '@/types/gist';

const PROVIDER_ICONS: Record<GistProviderType, string> = {
  github:
    'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
  gitee: 'https://gitee.com/assets/favicon.ico',
};

const PROVIDER_NAMES: Record<GistProviderType, string> = {
  github: 'GitHub',
  gitee: 'Gitee',
};

export function ProviderList() {
  const {
    providers,
    currentProvider,
    setCurrentProvider,
    addProvider,
    removeProvider,
  } = useGistStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [newProvider, setNewProvider] = useState({
    type: 'gitee' as GistProviderType,
    name: '',
    token: '',
  });

  const handleAddProvider = () => {
    if (!newProvider.name || !newProvider.token) {
      toast.warning('请填写完整信息');
      return;
    }

    const provider: GistProvider = {
      id: `${newProvider.type}-${Date.now()}`,
      type: newProvider.type,
      name: newProvider.name,
      token: newProvider.token,
      enabled: true,
    };

    addProvider(provider);
    setCurrentProvider(provider);
    setIsModalOpen(false);
    setNewProvider({ type: 'gitee', name: '', token: '' });
    toast.success('提供商添加成功');
  };

  const handleRemoveProvider = (id: string) => {
    removeProvider(id);
    toast.success('提供商已移除');
  };

  const handleSelectProvider = (provider: GistProvider) => {
    setCurrentProvider(provider);
    toast.success(`已切换到 ${provider.name}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">提供商管理</h2>
        <Button
          variant="primary"
          onClick={() => dialogRef.current?.showModal()}
        >
          添加提供商
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {providers.length === 0 ? (
          <Card className="col-span-full">
            <Card.Content className="flex items-center justify-center py-12">
              <div className="text-center text-default-500">
                <p className="text-lg mb-2">暂无提供商</p>
                <p className="text-sm">点击上方按钮添加 Gist 提供商</p>
              </div>
            </Card.Content>
          </Card>
        ) : (
          providers.map((provider) => (
            <Card
              key={provider.id}
              className="w-full"
            >
              <Card.Header className="justify-between">
                <div className="flex gap-3">
                  <Avatar
                    src={PROVIDER_ICONS[provider.type]}
                    name={PROVIDER_NAMES[provider.type]}
                    size="md"
                  />
                  <div className="flex flex-col">
                    <p className="text-md font-semibold">{provider.name}</p>
                    <p className="text-sm text-default-500">
                      {PROVIDER_NAMES[provider.type]}
                    </p>
                  </div>
                </div>
                <Chip
                  color={
                    currentProvider?.id === provider.id ? 'success' : 'default'
                  }
                  variant="tertiary"
                  size="sm"
                >
                  {currentProvider?.id === provider.id ? '当前' : '未选中'}
                </Chip>
              </Card.Header>
              <Card.Content>
                <p className="text-sm text-default-500">
                  Token: {provider.token.substring(0, 8)}...
                </p>
              </Card.Content>
              <Card.Footer className="gap-2">
                <Button
                  size="sm"
                  variant={
                    currentProvider?.id === provider.id ? 'flat' : 'solid'
                  }
                  color={
                    currentProvider?.id === provider.id
                      ? 'primary'
                      : 'secondary'
                  }
                  onClick={() => handleSelectProvider(provider)}
                >
                  {currentProvider?.id === provider.id ? '已选中' : '选中'}
                </Button>
                <Button
                  size="sm"
                  variant="light"
                  variant="danger"
                  onClick={() => handleRemoveProvider(provider.id)}
                >
                  删除
                </Button>
              </Card.Footer>
            </Card>
          ))
        )}
      </div>

      {/* 添加提供商对话框 */}
      <dialog
        ref={dialogRef}
        className="p-6 rounded-lg shadow-xl border w-full max-w-md"
      >
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">添加提供商</h3>
          <div className="space-y-4">
            <select
              className="w-full p-2 border rounded"
              value={newProvider.type}
              onChange={(e) =>
                setNewProvider({
                  ...newProvider,
                  type: e.target.value as GistProviderType,
                })
              }
            >
              <option value="github">GitHub</option>
              <option value="gitee">Gitee</option>
            </select>
            <Input
              label="名称"
              placeholder="输入提供商名称"
              value={newProvider.name}
              onChange={(e) =>
                setNewProvider({ ...newProvider, name: e.target.value })
              }
            />
            <Input
              label="Token"
              type="password"
              placeholder="输入 Access Token"
              value={newProvider.token}
              onChange={(e) =>
                setNewProvider({ ...newProvider, token: e.target.value })
              }
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="tertiary"
              onClick={() => dialogRef.current?.close()}
            >
              取消
            </Button>
            <Button
              variant="primary"
              onClick={handleAddProvider}
            >
              添加
            </Button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
