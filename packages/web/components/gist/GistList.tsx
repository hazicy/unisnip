'use client';

import { useEffect, useState } from 'react';
import { Card, Button, Chip, Input } from '@heroui/react';
import { toast } from '@heroui/react';
import { useGistStore } from '@/stores/useGistStore';
import { gistApi } from '@/lib/api/gist';
import { getFileType } from '@/lib/utils/fileType';
import type { Gist } from '@/types/gist';
import { useRouter } from 'next/navigation';

function GistCard({
  gist,
  onView,
  onDelete,
}: {
  gist: Gist;
  onView: () => void;
  onDelete: () => void;
}) {
  const fileCount = Object.keys(gist.files || {}).length;

  return (
    <Card
      className="w-full hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onView}
    >
      <Card.Header className="justify-between">
        <div className="flex flex-col items-start gap-1">
          <p className="text-lg font-semibold line-clamp-1">
            {gist.description || '无描述'}
          </p>
          <div className="flex gap-2 items-center">
            <Chip
              size="sm"
              variant="tertiary"
              color={gist.public ? 'success' : 'default'}
            >
              {gist.public ? '公开' : '私有'}
            </Chip>
            <span className="text-sm text-default-500">{fileCount} 个文件</span>
          </div>
        </div>
      </Card.Header>
      <Card.Content>
        <div className="flex flex-wrap gap-2">
          {gist.files &&
            Object.keys(gist.files)
              .slice(0, 5)
              .map((filename) => {
                const ft = getFileType(filename);
                return (
                  <Chip
                    key={filename}
                    size="sm"
                    variant="bordered"
                    className="text-xs"
                  >
                    {filename}
                  </Chip>
                );
              })}
          {fileCount > 5 && (
            <Chip
              size="sm"
              variant="tertiary"
            >
              +{fileCount - 5} 更多
            </Chip>
          )}
        </div>
        <div className="mt-3 text-xs text-default-400">
          创建于: {new Date(gist.created_at).toLocaleDateString('zh-CN')}
          {gist.updated_at !== gist.created_at && (
            <span className="ml-2">
              | 更新于: {new Date(gist.updated_at).toLocaleDateString('zh-CN')}
            </span>
          )}
        </div>
      </Card.Content>
      <Card.Footer className="justify-end gap-2">
        <Button
          size="sm"
          variant="light"
          variant="danger"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          删除
        </Button>
      </Card.Footer>
    </Card>
  );
}

export function GistList() {
  const router = useRouter();
  const {
    gists,
    currentProvider,
    isLoading,
    setGists,
    setLoading,
    setError,
    addGist,
    removeGistFromStore,
    setCreateModalOpen,
  } = useGistStore();

  const [filter, setFilter] = useState<'all' | 'public' | 'private'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchGists = async () => {
    if (!currentProvider) {
      toast.warning('请先选择提供商');
      return;
    }

    setLoading(true);
    try {
      const data = await gistApi.getGists(currentProvider);
      setGists(data);
    } catch (error) {
      setError((error as Error).message);
      toast.danger('获取 Gist 失败: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentProvider) {
      fetchGists();
    }
  }, [currentProvider?.id]);

  const handleDelete = async (gist: Gist) => {
    if (!currentProvider) return;

    try {
      await gistApi.deleteGist(currentProvider, gist.id);
      removeGistFromStore(gist.id);
      toast.success('删除成功');
    } catch (error) {
      toast.danger('删除失败: ' + (error as Error).message);
    }
  };

  const filteredGists = gists.filter((gist) => {
    const matchesFilter =
      filter === 'all' || (filter === 'public' ? gist.public : !gist.public);
    const matchesSearch =
      !searchQuery ||
      gist.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      Object.keys(gist.files || {}).some((f) =>
        f.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold">Gist 列表</h2>
        <div className="flex gap-2 w-full sm:w-auto flex-wrap">
          <Input
            placeholder="搜索 Gist..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64"
          />
          <select
            className="p-2 border rounded"
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
          >
            <option value="all">全部</option>
            <option value="public">公开</option>
            <option value="private">私有</option>
          </select>
          <Button
            variant="primary"
            onClick={() => setCreateModalOpen(true)}
          >
            新建
          </Button>
        </div>
      </div>

      {!currentProvider && (
        <Card>
          <Card.Content className="flex items-center justify-center py-12">
            <div className="text-center text-default-500">
              <p className="text-lg mb-2">请先添加并选择提供商</p>
              <Button
                variant="primary"
                variant="tertiary"
                onClick={() => router.push('/providers')}
              >
                前往提供商管理
              </Button>
            </div>
          </Card.Content>
        </Card>
      )}

      {currentProvider && isLoading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {currentProvider && !isLoading && filteredGists.length === 0 && (
        <Card>
          <Card.Content className="flex items-center justify-center py-12">
            <div className="text-center text-default-500">
              <p className="text-lg mb-2">暂无 Gist</p>
              <Button
                variant="primary"
                variant="tertiary"
                onClick={() => setCreateModalOpen(true)}
              >
                创建第一个 Gist
              </Button>
            </div>
          </Card.Content>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGists.map((gist) => (
          <GistCard
            key={gist.id}
            gist={gist}
            onView={() => router.push(`/gist/${gist.id}`)}
            onDelete={() => handleDelete(gist)}
          />
        ))}
      </div>
    </div>
  );
}
