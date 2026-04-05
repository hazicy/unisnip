'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Input,
  Tabs,
  Tab,
  ListBox,
  ListBoxItem,
  Chip,
} from '@heroui/react';
import { toast } from '@heroui/react';
import { useGistStore } from '@/stores/useGistStore';
import { useEditorStore } from '@/stores/useEditorStore';
import { gistApi } from '@/lib/api/gist';
import { ProseMirrorEditor } from '@/components/editor/ProseMirrorEditor';
import { MarkdownRenderer } from '@/components/display/MarkdownRenderer';
import { JupyterViewer } from '@/components/display/JupyterViewer';
import { CodeBlock } from '@/components/display/CodeBlock';
import {
  isMarkdownFile,
  isJupyterFile,
  getLanguageFromFilename,
} from '@/lib/utils/fileType';

export default function GistDetailPage() {
  const params = useParams();
  const router = useRouter();
  const gistId = params.id as string;
  const deleteDialogRef = useRef<HTMLDialogElement>(null);

  const { currentProvider, gists, updateGistInStore, removeGistFromStore } =
    useGistStore();
  const {
    content,
    setContent,
    isDirty,
    setDirty,
    isPreviewMode,
    setPreviewMode,
    reset,
  } = useEditorStore();

  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [description, setDescription] = useState('');

  const gist = gists.find((g) => g.id === gistId);
  const files = gist?.files ? Object.values(gist.files) : [];

  // 加载 Gist 数据
  useEffect(() => {
    if (!currentProvider || !gistId) return;

    const loadGist = async () => {
      setIsLoading(true);
      try {
        const data = await gistApi.getGist(currentProvider, gistId);
        setDescription(data.description || '');
        updateGistInStore(gistId, data);

        const fileNames = Object.keys(data.files || {});
        if (fileNames.length > 0 && !selectedFile) {
          setSelectedFile(fileNames[0]);
        }
      } catch (error) {
        toast.danger('加载失败: ' + (error as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    if (!gist) {
      loadGist();
    } else {
      setDescription(gist.description || '');
      const fileNames = Object.keys(gist.files || {});
      if (fileNames.length > 0 && !selectedFile) {
        setSelectedFile(fileNames[0]);
      }
    }
  }, [gistId, currentProvider?.id]);

  // 加载文件内容
  useEffect(() => {
    if (!currentProvider || !selectedFile || !gistId) return;

    const loadContent = async () => {
      setIsLoading(true);
      try {
        const content = await gistApi.getGistContent(
          currentProvider,
          gistId,
          selectedFile,
        );
        setFileContent(content);
        setContent(content);
        setDirty(false);
      } catch (error) {
        toast.danger('加载文件失败: ' + (error as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    loadContent();

    return () => {
      reset();
    };
  }, [selectedFile, gistId, currentProvider?.id]);

  // 保存文件
  const handleSave = async () => {
    if (!currentProvider || !gistId || !selectedFile || !isDirty) return;

    setIsSaving(true);
    try {
      const updatedGist = await gistApi.updateGistContent(
        currentProvider,
        gistId,
        selectedFile,
        content,
      );
      updateGistInStore(gistId, updatedGist);
      setDirty(false);
      toast.success('保存成功');
    } catch (error) {
      toast.danger('保存失败: ' + (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  // 更新 Gist 描述
  const handleUpdateDescription = async () => {
    if (!currentProvider || !gistId) return;

    try {
      await gistApi.updateGist(currentProvider, gistId, { description });
      updateGistInStore(gistId, { description });
      toast.success('描述更新成功');
    } catch (error) {
      toast.danger('更新失败: ' + (error as Error).message);
    }
  };

  // 删除 Gist
  const handleDelete = async () => {
    if (!currentProvider || !gistId) return;

    try {
      await gistApi.deleteGist(currentProvider, gistId);
      removeGistFromStore(gistId);
      toast.success('删除成功');
      router.push('/gists');
    } catch (error) {
      toast.danger('删除失败: ' + (error as Error).message);
    }
  };

  // 内容变化处理
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setDirty(true);
  };

  const handleBack = () => {
    if (isDirty) {
      if (confirm('有未保存的更改，确定要离开吗？')) {
        router.push('/gists');
      }
    } else {
      router.push('/gists');
    }
  };

  // 根据文件类型渲染内容
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (!fileContent) {
      return <p className="text-default-500">文件为空</p>;
    }

    if (selectedFile && isMarkdownFile(selectedFile)) {
      if (isPreviewMode) {
        return <MarkdownRenderer content={fileContent} />;
      }
      return (
        <ProseMirrorEditor
          content={fileContent}
          onChange={handleContentChange}
        />
      );
    }

    if (selectedFile && isJupyterFile(selectedFile)) {
      return <JupyterViewer content={fileContent} />;
    }

    // 代码文件
    if (isPreviewMode && selectedFile) {
      return (
        <CodeBlock
          content={fileContent}
          language={getLanguageFromFilename(selectedFile)}
        />
      );
    }

    return (
      <ProseMirrorEditor
        content={fileContent}
        onChange={handleContentChange}
      />
    );
  };

  if (!currentProvider) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <Card.Content className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-lg mb-4">请先选择提供商</p>
              <Button
                variant="primary"
                onClick={() => router.push('/providers')}
              >
                前往提供商管理
              </Button>
            </div>
          </Card.Content>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 h-screen flex flex-col">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <Button
            variant="tertiary"
            onClick={handleBack}
          >
            返回
          </Button>
          <div className="flex flex-col">
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleUpdateDescription}
              placeholder="Gist 描述"
              variant="primary"
              className="w-64"
            />
          </div>
          <Chip
            variant="tertiary"
            color={gist?.public ? 'success' : 'default'}
          >
            {gist?.public ? '公开' : '私有'}
          </Chip>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isDirty && <Chip color="warning">未保存</Chip>}
          <Button
            variant="primary"
            onClick={handleSave}
            isDisabled={!isDirty}
          >
            保存
          </Button>
          <Button
            variant="danger"
            onClick={() => deleteDialogRef.current?.showModal()}
          >
            删除
          </Button>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex flex-1 gap-4 overflow-hidden flex-col lg:flex-row">
        {/* 文件列表 */}
        <Card className="w-full lg:w-64 flex-shrink-0">
          <Card.Content className="p-0">
            <ListBox
              aria-label="文件列表"
              selectionMode="single"
              selectedKeys={selectedFile ? [selectedFile] : []}
              onSelectionChange={(keys) => {
                const file = Array.from(keys)[0] as string;
                if (file) setSelectedFile(file);
              }}
            >
              {files.map((file) => (
                <ListBoxItem key={file.filename}>{file.filename}</ListBoxItem>
              ))}
            </ListBox>
          </Card.Content>
        </Card>

        {/* 编辑器/预览区 */}
        <Card className="flex-1 overflow-hidden">
          <Card.Content className="h-full overflow-auto">
            {selectedFile && (
              <Tabs
                selectedKey={isPreviewMode ? 'preview' : 'edit'}
                onSelectionChange={(key) => setPreviewMode(key === 'preview')}
              >
                <Tabs.List>
                  <Tabs.Tab key="edit">编辑</Tabs.Tab>
                  <Tabs.Tab key="preview">预览</Tabs.Tab>
                </Tabs.List>
              </Tabs>
            )}
            <div className="mt-4">{renderContent()}</div>
          </Card.Content>
        </Card>
      </div>

      {/* 删除确认对话框 */}
      <dialog
        ref={deleteDialogRef}
        className="p-6 rounded-lg shadow-xl border"
      >
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">确认删除</h3>
          <p>确定要删除这个 Gist 吗？此操作不可恢复。</p>
          <div className="flex justify-end gap-2">
            <Button
              variant="tertiary"
              onClick={() => deleteDialogRef.current?.close()}
            >
              取消
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                deleteDialogRef.current?.close();
                handleDelete();
              }}
            >
              删除
            </Button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
