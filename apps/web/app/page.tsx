'use client';

import { Button, Card } from '@heroui/react';
import Link from 'next/link';
import { Suspense, useEffect } from 'react';

const Test = () => {
  useEffect(() => {
    
  }, []);

  return <div>56</div>;
};

export default function Home() {
  return (
    <>
      <Suspense fallback={<div>dsd</div>}>
        <div>565</div>
      </Suspense>

      <div className="container mx-auto p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="mt-12">
            <Card.Header className="flex flex-col items-center justify-center pb-2">
              <h1 className="text-3xl font-bold">GistHub</h1>
              <p className="text-default-500">管理你的 GitHub Gists</p>
            </Card.Header>
            <Card.Content className="flex items-center justify-center py-8">
              <div className="flex gap-4">
                <Link href="/gists">
                  <Button
                    variant="primary"
                    size="lg"
                  >
                    查看 Gists
                  </Button>
                </Link>
                <Link href="/providers">
                  <Button
                    variant="tertiary"
                    size="lg"
                  >
                    管理提供商
                  </Button>
                </Link>
              </div>
            </Card.Content>
            <Card.Footer className="justify-center">
              <p className="text-sm text-default-400">支持 GitHub 提供商</p>
            </Card.Footer>
          </Card>
        </div>
      </div>
    </>
  );
}
