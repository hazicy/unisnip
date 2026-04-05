'use client';

import { useEffect, Suspense } from 'react';
import { Card, Button } from '@heroui/react';
import { createAuthClient } from 'better-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';

// 创建 auth client
const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:3000',
});

function SignInContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const provider = searchParams.get('provider') as 'github' | 'gitee' | null;

  useEffect(() => {
    if (provider) {
      handleSignIn(provider);
    }
  }, [provider]);

  const handleSignIn = async (providerId: 'github' | 'gitee') => {
    try {
      await authClient.signIn.social({
        provider: providerId,
        callbackURL: '/providers',
      });
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6">
        <Card.Header className="flex flex-col items-center pb-4">
          <h1 className="text-2xl font-bold">登录 GistHub</h1>
          <p className="text-default-500">选择登录方式</p>
        </Card.Header>
        <Card.Content className="space-y-4">
          <Button className="w-full" onClick={() => handleSignIn('github')}>
            使用 GitHub 登录
          </Button>

          <Button className="w-full" onClick={() => handleSignIn('gitee')}>
            使用 Gitee 登录
          </Button>
        </Card.Content>
        <Card.Footer className="justify-center">
          <Button onClick={() => router.push('/providers')}>
            返回提供商管理
          </Button>
        </Card.Footer>
      </Card>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInContent />
    </Suspense>
  );
}