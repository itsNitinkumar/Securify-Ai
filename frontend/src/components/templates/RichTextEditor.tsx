import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import { useEffect } from 'react';

interface RichTextEditorProps {
  content: any;
  onChange?: (json: any, plainText: string) => void;
  readOnly?: boolean;
  placeholder?: string;
}

const parseInitialContent = (content: any): any[] => {
  if (!content) {
    return [{ type: 'paragraph', content: [] }];
  }
  if (Array.isArray(content)) {
    return content;
  }
  if (content.type === 'doc' && Array.isArray(content.content)) {
    return content.content;
  }
  if (typeof content === 'string') {
    return content.split('\n').filter(Boolean).map((line: string) => ({
      type: 'paragraph',
      content: [{ type: 'text', text: line }],
    }));
  }
  return [{ type: 'paragraph', content: [] }];
};

const extractPlainText = (blocks: any[]): string => {
  const walk = (node: any): string => {
    if (!node) return '';
    if (node.type === 'text') return node.text || '';
    if (node.type === 'paragraph' || node.type === 'heading') {
      return (node.content || []).map(walk).join('');
    }
    if (node.type === 'bulletListItem' || node.type === 'numberedListItem' || node.type === 'listItem') {
      const text = (node.content || []).map(walk).join('');
      return `- ${text}`;
    }
    if (Array.isArray(node.content)) return node.content.map(walk).join('\n');
    return '';
  };
  return blocks.map(walk).join('\n').trim();
};

const RichTextEditor = ({ content, onChange, readOnly = false, placeholder }: RichTextEditorProps) => {
  const initialContent = parseInitialContent(content);

  const editor = useCreateBlockNote({
    initialContent,
  });

  useEffect(() => {
    (editor as any).isEditable = !readOnly;
  }, [editor, readOnly]);

  return (
    <BlockNoteView
      editor={editor}
      theme="dark"
      onChange={() => {
        if (onChange) {
          const json = editor.document;
          const plainText = extractPlainText(json);
          onChange(json, plainText);
        }
      }}
      style={{ minHeight: 150 }}
    />
  );
};

export default RichTextEditor;
