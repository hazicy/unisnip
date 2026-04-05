'use client';

import { useEffect, useRef, useState } from 'react';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Schema, DOMParser } from 'prosemirror-model';
import { schema as basicSchema } from 'prosemirror-schema-basic';
import { addListNodes } from 'prosemirror-schema-list';
import { history, undo, redo } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap, toggleMark, setBlockType } from 'prosemirror-commands';
import { dropCursor } from 'prosemirror-dropcursor';
import { gapCursor } from 'prosemirror-gapcursor';
import { InputRule, inputRules } from 'prosemirror-inputrules';
import { markdown } from 'prosemirror-markdown';
import { Button } from '@heroui/react';

interface ProseMirrorEditorProps {
  content: string;
  onChange: (content: string) => void;
  readOnly?: boolean;
  placeholder?: string;
}

// 创建带有列表支持的 schema
const mySchema = new Schema({
  nodes: addListNodes(basicSchema.spec.nodes, 'paragraph block*', 'block'),
  marks: basicSchema.spec.marks,
});

export function ProseMirrorEditor({
  content,
  onChange,
  readOnly = false,
  placeholder = '开始输入...',
}: ProseMirrorEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // 添加 markdown 快捷键的输入规则
  const markdownRules = () => {
    const rules: InputRule[] = [];

    // 加粗 **text**
    rules.push(
      new InputRule(/\*\*([^*]+)\*\*$/, (state, _match, start, end) => {
        const tr = state.tr;
        const text = state.doc.textBetween(start, end);
        tr.replaceWith(
          start - 2,
          end,
          mySchema.nodes.code_markup.create(null, mySchema.text(text)),
        );
        return tr;
      }),
    );

    // 斜体 *text*
    rules.push(
      new InputRule(/\*([^*]+)\*$/, (state, _match, start, end) => {
        const tr = state.tr;
        const text = state.doc.textBetween(start, end);
        tr.replaceWith(
          start - 1,
          end,
          mySchema.nodes.emphasis.create(null, mySchema.text(text)),
        );
        return tr;
      }),
    );

    // 代码 `text`
    rules.push(
      new InputRule(/`([^`]+)`$/, (state, _match, start, end) => {
        const tr = state.tr;
        const text = state.doc.textBetween(start, end);
        tr.replaceWith(
          start - 1,
          end,
          mySchema.nodes.code.create(null, mySchema.text(text)),
        );
        return tr;
      }),
    );

    return inputRules({ rules });
  };

  useEffect(() => {
    if (!editorRef.current) return;

    const state = EditorState.create({
      doc: content
        ? DOMParser.fromSchema(mySchema).parse(
            new window.DOMParser().parseFromString(
              `<div>${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`,
              'text/html',
            ).body.firstChild as Element,
          )
        : mySchema.node('doc', null, [mySchema.node('paragraph')]),
      schema: mySchema,
      plugins: [
        history(),
        keymap({ 'Mod-z': undo, 'Mod-y': redo, 'Mod-Shift-z': redo }),
        keymap(baseKeymap),
        keymap({
          'Mod-b': toggleMark(mySchema.marks.strong),
          'Mod-i': toggleMark(mySchema.marks.em),
          'Mod-`': toggleMark(mySchema.marks.code),
        }),
        dropCursor(),
        gapCursor(),
        markdownRules(),
      ],
    });

    const view = new EditorView(editorRef.current, {
      state,
      editable: () => !readOnly,
      dispatchTransaction(transaction) {
        const newState = view.state.apply(transaction);
        view.updateState(newState);

        if (transaction.docChanged) {
          const markdownContent = serializeToMarkdown(newState.doc);
          onChange(markdownContent);
        }
      },
    });

    viewRef.current = view;
    setIsInitialized(true);

    return () => {
      view.destroy();
    };
  }, []);

  // 同步外部内容变化
  useEffect(() => {
    if (!viewRef.current || !isInitialized) return;

    const currentContent = serializeToMarkdown(viewRef.current.state.doc);
    if (content !== currentContent) {
      const newState = EditorState.create({
        doc: DOMParser.fromSchema(mySchema).parse(
          new window.DOMParser().parseFromString(
            `<div>${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`,
            'text/html',
          ).body.firstChild as Element,
        ),
        schema: mySchema,
        plugins: [
          history(),
          keymap({ 'Mod-z': undo, 'Mod-y': redo, 'Mod-Shift-z': redo }),
          keymap(baseKeymap),
          dropCursor(),
          gapCursor(),
        ],
      });
      viewRef.current.updateState(newState);
    }
  }, [content, isInitialized]);

  const serializeToMarkdown = (doc: any): string => {
    let result = '';
    doc.descendants((node: any) => {
      if (node.isText) {
        result += node.text;
      } else if (node.type.name === 'paragraph') {
        result += '\n';
      } else if (node.type.name === 'heading') {
        result += '\n' + '#'.repeat(node.attrs.level) + ' ';
      } else if (node.type.name === 'code_block') {
        result += '```\n' + node.textContent + '\n```\n';
      } else if (node.type.name === 'bullet_list') {
        result += '\n';
      } else if (node.type.name === 'ordered_list') {
        result += '\n';
      } else if (node.type.name === 'list_item') {
        result += '- ';
      }
    });
    return result.trim();
  };

  const execCommand = (command: any) => {
    if (!viewRef.current) return;
    command(viewRef.current.state, viewRef.current.dispatch, viewRef.current);
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      {!readOnly && (
        <div className="flex gap-1 p-2 border-b bg-default-50">
          <Button
            size="sm"
            variant="tertiary"
            onClick={() => execCommand(toggleMark(mySchema.marks.strong))}
          >
            B
          </Button>
          <Button
            size="sm"
            variant="tertiary"
            onClick={() => execCommand(toggleMark(mySchema.marks.em))}
          >
            I
          </Button>
          <Button
            size="sm"
            variant="tertiary"
            onClick={() => execCommand(toggleMark(mySchema.marks.code))}
          >
            {'</>'}
          </Button>
          <Button
            size="sm"
            variant="tertiary"
            onClick={() => execCommand(undo)}
          >
            撤销
          </Button>
          <Button
            size="sm"
            variant="tertiary"
            onClick={() => execCommand(redo)}
          >
            重做
          </Button>
        </div>
      )}
      <div
        ref={editorRef}
        className="prosemirror-editor p-4 min-h-[400px] focus:outline-none"
        style={{ fontFamily: 'inherit' }}
      />
    </div>
  );
}
