'use client';

import { useState, useRef } from 'react';
import { Button, Input, Switch } from '@heroui/react';
import { toast } from '@heroui/react';
import { useGistStore } from '@/stores/useGistStore';
import { gistApi } from '@/lib/api/gist';

interface CreateGistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateGistModal({ isOpen, onClose }: CreateGistModalProps) {
  const { currentProvider, addGist } = useGistStore();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [files, setFiles] = useState([{ name: '', content: '' }]);
  const [isCreating, setIsCreating] = useState(false);

  // Handle dialog visibility
  useState(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.showModal();
    } else if (!isOpen && dialogRef.current?.open) {
      dialogRef.current?.close();
    }
  });

  const handleAddFile = () => {
    setFiles([...files, { name: '', content: '' }]);
  };

  const handleRemoveFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleFileChange = (
    index: number,
    field: 'name' | 'content',
    value: string,
  ) => {
    const newFiles = [...files];
    newFiles[index][field] = value;
    setFiles(newFiles);
  };

  const handleClose = () => {
    dialogRef.current?.close();
    onClose();
    setDescription('');
    setIsPublic(false);
    setFiles([{ name: '', content: '' }]);
  };

  const handleCreate = async () => {
    if (!currentProvider) {
      toast.warning('请先选择提供商');
      return;
    }

    const validFiles = files.filter((f) => f.name.trim());
    if (validFiles.length === 0) {
      toast.warning('请至少添加一个文件');
      return;
    }

    setIsCreating(true);
    try {
      const fileContents: Record<string, { content: string }> = {};
      validFiles.forEach((f) => {
        fileContents[f.name] = { content: f.content };
      });

      const newGist = await gistApi.createGist(currentProvider, {
        description,
        files: fileContents,
        public: isPublic,
      });

      addGist(newGist);
      toast.success('创建成功');
      handleClose();
    } catch (error) {
      toast.danger('创建失败: ' + (error as Error).message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="p-6 rounded-lg shadow-xl border w-full max-w-2xl"
    >
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">创建新 Gist</h3>
        <div className="space-y-4">
          <Input
            label="描述"
            placeholder="输入 Gist 描述"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <Switch
            isSelected={isPublic}
            onChange={() => setIsPublic(!isPublic)}
          >
            公开 Gist
          </Switch>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium">文件</p>
              <Button
                size="sm"
                variant="light"
                onClick={handleAddFile}
              >
                添加文件
              </Button>
            </div>

            {files.map((file, index) => (
              <div
                key={index}
                className="flex gap-2 items-start flex-wrap"
              >
                <Input
                  placeholder="文件名 (如: test.py)"
                  value={file.name}
                  onChange={(e) =>
                    handleFileChange(index, 'name', e.target.value)
                  }
                  className="w-1/3 min-w-[200px]"
                />
                <Input
                  placeholder="文件内容"
                  value={file.content}
                  onChange={(e) =>
                    handleFileChange(index, 'content', e.target.value)
                  }
                  className="flex-1 min-w-[200px]"
                />
                {files.length > 1 && (
                  <Button
                    size="sm"
                    variant="light"
                    variant="danger"
                    onClick={() => handleRemoveFile(index)}
                  >
                    删除
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="tertiary"
            onClick={handleClose}
          >
            取消
          </Button>
          <Button
            variant="primary"
            onClick={handleCreate}
          >
            创建
          </Button>
        </div>
      </div>
    </dialog>
  );
}
