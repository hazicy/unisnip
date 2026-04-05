'use client';

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Button } from '@heroui/react';
import { useState } from 'react';

interface CodeBlockProps {
  content: string;
  language?: string;
}

export function CodeBlock({ content, language = 'plaintext' }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative rounded-lg overflow-hidden my-4">
      <div className="flex justify-between items-center px-4 py-2 bg-default-100 border-b border-default-200">
        <span className="text-sm text-default-500 uppercase">{language}</span>
        <Button
          size="sm"
          variant="tertiary"
          onClick={handleCopy}
        >
          {copied ? '已复制' : '复制'}
        </Button>
      </div>
      <SyntaxHighlighter
        style={oneDark}
        language={language}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: '0 0 0.5rem 0.5rem',
          fontSize: '0.875rem',
        }}
      >
        {content}
      </SyntaxHighlighter>
    </div>
  );
}
