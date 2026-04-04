import { giteeInstance } from '.';
import type { GistObject } from './type';

export async function getGist() {
  const data = await giteeInstance.get<GistObject[]>('/gists', {
    params: {
      page: 1,
    },
  });

  return data.data;
}

export function createGist() {
  giteeInstance.post('/gists', {
    files: { 未命名: '' },
  });
}

export async function getGistId(id: string) {
  const data = await giteeInstance.get<GistObject>(`/gists/${id}`, {
    params: {
      id,
    },
  });

  return data.data;
}

export async function updateGist(params: {
  id: string;
  description?: string;
  files?: Record<string, { content?: any; description?: string } | null>;
}) {
  const { id, description, files } = params;

  const data = await giteeInstance.patch(`/gists/${id}`, {
    description,
    files,
  });

  return data;
}

export async function deleteFile(params: {
  id: string;
  description?: string;
  files?: Record<string, { content?: string; description?: string } | null>;
}) {
  const { id, description, files } = params;

  const data = await giteeInstance.patch(`/gists/${id}`, {
    description,
    files,
  });

  return data;
}
