'use client';

import { useMemo, useState } from 'react';
import { Card, Button } from '@heroui/react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { CodeBlock } from './CodeBlock';

// Jupyter Notebook 类型定义
interface NotebookCell {
  cell_type: 'code' | 'markdown' | 'raw';
  source: string | string[];
  outputs?: CellOutput[];
  metadata?: Record<string, any>;
  execution_count?: number | null;
}

interface CellOutput {
  output_type: 'stream' | 'execute_result' | 'display_data' | 'error';
  name?: string;
  text?: string | string[];
  data?: Record<string, string | string[]>;
  ename?: string;
  evalue?: string;
}

interface NotebookData {
  cells: NotebookCell[];
  metadata: Record<string, any>;
  nbformat: number;
  nbformat_minor: number;
}

interface JupyterViewerProps {
  content: string;
}

function CellOutputRenderer({ output }: { output: CellOutput }) {
  switch (output.output_type) {
    case 'stream':
      return (
        <pre className="text-sm font-mono whitespace-pre-wrap text-default-700">
          {Array.isArray(output.text) ? output.text.join('') : output.text}
        </pre>
      );

    case 'execute_result':
    case 'display_data':
      if (output.data) {
        // 处理图像输出
        const imageMimeTypes = [
          'image/png',
          'image/jpeg',
          'image/gif',
          'image/svg+xml',
        ];
        for (const mimeType of imageMimeTypes) {
          if (output.data[mimeType]) {
            const data = Array.isArray(output.data[mimeType])
              ? output.data[mimeType][0]
              : output.data[mimeType];
            const isBase64 =
              typeof data === 'string' && data.startsWith('data:');
            if (mimeType === 'image/svg+xml' || isBase64) {
              return (
                <div
                  className="my-2"
                  dangerouslySetInnerHTML={{ __html: data as string }}
                />
              );
            }
            return (
              <img
                src={`data:${mimeType};base64,${data}`}
                alt="Notebook output"
                className="max-w-full my-2 rounded"
              />
            );
          }
        }
        // 文本输出
        if (output.data['text/plain']) {
          const text = Array.isArray(output.data['text/plain'])
            ? output.data['text/plain'].join('')
            : output.data['text/plain'];
          return (
            <pre className="text-sm font-mono whitespace-pre-wrap">{text}</pre>
          );
        }
      }
      return null;

    case 'error':
      return (
        <pre className="text-sm font-mono text-danger whitespace-pre-wrap">
          {output.ename}: {output.evalue}
        </pre>
      );

    default:
      return null;
  }
}

function JupyterCell({ cell }: { cell: NotebookCell }) {
  const source = Array.isArray(cell.source)
    ? cell.source.join('')
    : cell.source;
  const [isInputExpanded, setIsInputExpanded] = useState(true);

  if (cell.cell_type === 'markdown') {
    return (
      <div className="jupyter-markdown-cell my-4">
        <MarkdownRenderer content={source} />
      </div>
    );
  }

  if (cell.cell_type === 'raw') {
    return (
      <div className="jupyter-raw-cell my-4 p-3 bg-default-50 rounded">
        <pre className="whitespace-pre-wrap">{source}</pre>
      </div>
    );
  }

  // Code cell
  return (
    <div className="jupyter-code-cell my-4 border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-default-100 border-b border-default-200">
        <span className="text-sm text-default-500">
          {cell.execution_count !== null && cell.execution_count !== undefined
            ? `[${cell.execution_count}]`
            : '[ ]'}
        </span>
        <Button
          size="sm"
          variant="light"
          onClick={() => setIsInputExpanded(!isInputExpanded)}
        >
          {isInputExpanded ? '隐藏' : '显示'}
        </Button>
      </div>

      {isInputExpanded && (
        <div className="p-0">
          <CodeBlock
            content={source}
            language="python"
          />
        </div>
      )}

      {cell.outputs && cell.outputs.length > 0 && (
        <div className="border-t border-default-200">
          {cell.outputs.map((output, idx) => (
            <div
              key={idx}
              className="p-3"
            >
              <CellOutputRenderer output={output} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function JupyterViewer({ content }: JupyterViewerProps) {
  const notebook = useMemo(() => {
    try {
      return JSON.parse(content) as NotebookData;
    } catch {
      return null;
    }
  }, [content]);

  if (!notebook) {
    return (
      <Card className="p-4">
        <p className="text-danger">无效的 Notebook 格式</p>
      </Card>
    );
  }

  if (!notebook.cells || !Array.isArray(notebook.cells)) {
    return (
      <Card className="p-4">
        <p className="text-warning">Notebook 格式不正确：缺少 cells 数组</p>
      </Card>
    );
  }

  return (
    <div className="jupyter-notebook">
      <div className="mb-4 p-3 bg-default-100 rounded-lg">
        <h3 className="font-semibold">Jupyter Notebook</h3>
        {notebook.metadata?.kernelspec && (
          <p className="text-sm text-default-500">
            Kernel: {notebook.metadata.kernelspec.name}
          </p>
        )}
        {notebook.metadata?.language_info && (
          <p className="text-sm text-default-500">
            Language: {notebook.metadata.language_info.name}
          </p>
        )}
      </div>

      {notebook.cells.map((cell, index) => (
        <JupyterCell
          key={index}
          cell={cell}
        />
      ))}
    </div>
  );
}
