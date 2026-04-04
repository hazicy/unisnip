import * as vscode from 'vscode';

export async function getGithubAccessToken() {
  const scopes: string[] = ['gist'];

  const session = await vscode.authentication.getSession('github', scopes, {
    createIfNone: true,
  });

  if (!session) {
    throw new Error('');
  }

  const accessToken = session.accessToken;

  return accessToken;
}

export async function getGiteeAccessToken() {
  const scopes: string[] = ['gist'];

  const session = await vscode.authentication.getSession('gitee', scopes, {
    createIfNone: true,
  });

  if (!session) {
    throw new Error('');
  }

  const accessToken = session.accessToken;

  return accessToken;
}
