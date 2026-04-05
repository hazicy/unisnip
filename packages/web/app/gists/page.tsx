'use client';

import { GistList } from '@/components/gist/GistList';
import { CreateGistModal } from '@/components/gist/CreateGistModal';
import { useGistStore } from '@/stores/useGistStore';

export default function GistsPage() {
  const { isCreateModalOpen, setCreateModalOpen, currentProvider } =
    useGistStore();

  return (
    <div className="container mx-auto p-6">
      <GistList />
      <CreateGistModal
        isOpen={isCreateModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </div>
  );
}
