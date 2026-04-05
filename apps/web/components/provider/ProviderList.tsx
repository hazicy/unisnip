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

  // OAuth 登录处理 - 跳转到登录页面
  const handleOAuthSignIn = (type: GistProviderType) => {
    window.location.href = `/sign-in?provider=${type}`;
  };

  // 手动添加 Provider
  const handleAddProvider = () => {
    const tokenInput = document.getElementById('provider-token') as HTMLInputElement;
    const nameInput = document.getElementById('provider-name') as HTMLInputElement;
    const typeSelect = document.getElementById('provider-type') as HTMLSelectElement;

    const token = tokenInput?.value;
    const name = nameInput?.value;
    const type = typeSelect?.value as GistProviderType;

    if (!name || !token) {
      toast.warning('请填写完整信息');
      return;
    }

    const provider: GistProvider = {
      id: `${type}-${Date.now()}`,
      type,
      name,
      token,
      enabled: true,
    };

    addProvider(provider);
    setCurrentProvider(provider);
    setIsModalOpen(false);
    toast.success('提供商添加成功');

    // 重置表单
    if (tokenInput) tokenInput.value = '';
    if (nameInput) nameInput.value = '';
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
        <div className="flex gap-2">
          <Button onClick={() => handleOAuthSignIn('github')}>
            GitHub OAuth 登录
          </Button>
          <Button onClick={() => handleOAuthSignIn('gitee')}>
            Gitee OAuth 登录
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {providers.length === 0 ? (
          <Card className="col-span-full">
            <Card.Content className="flex items-center justify-center py-12">
              <div className="text-center text-default-500">
                <p className="text-lg mb-2">暂无提供商</p>
                <p className="text-sm">点击上方按钮 OAuth 登录或手动添加 Token</p>
              </div>
            </Card.Content>
          </Card>
        ) : (
          providers.map((provider) => (
            <Card key={provider.id} className="w-full">
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
                  onClick={() => handleSelectProvider(provider)}
                >
                  {currentProvider?.id === provider.id ? '已选中' : '选中'}
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleRemoveProvider(provider.id)}
                >
                  删除
                </Button>
              </Card.Footer>
            </Card>
          ))
        )}
      </div>

      {/* 手动添加提供商对话框 */}
      <Button onClick={() => setIsModalOpen(true)}>
        手动添加 Token
      </Button>

      {/* 手动添加对话框 */}
      {isModalOpen && (
        <dialog open className="modal backdrop:bg-black/50" onClose={() => setIsModalOpen(false)}>
          <div className="modal-box p-6 rounded-lg shadow-xl border w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">手动添加提供商</h3>
            <div className="space-y-4">
              <select id="provider-type" className="select select-bordered w-full">
                <option value="github">GitHub</option>
                <option value="gitee">Gitee</option>
              </select>
              <Input
                id="provider-name"
                placeholder="输入提供商名称"
              />
              <Input
                id="provider-token"
                type="password"
                placeholder="输入 Access Token"
              />
              <div className="flex justify-end gap-2">
                <Button onClick={() => setIsModalOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleAddProvider}>
                  添加
                </Button>
              </div>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setIsModalOpen(false)}>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
}