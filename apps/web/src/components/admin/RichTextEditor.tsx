'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { useEffect } from 'react';

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
};

export function RichTextEditor({ value, onChange, placeholder, minHeight = 240 }: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Link.configure({ openOnClick: false, autolink: true }),
      Image.configure({ inline: false }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!editor) return null;

  const btn = (active: boolean) => ({
    padding: '4px 8px',
    border: '1px solid #ddd',
    background: active ? '#1a7f37' : '#fff',
    color: active ? '#fff' : '#333',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 13,
  });

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden' }}>
      <div
        style={{
          display: 'flex',
          gap: 4,
          padding: 6,
          background: '#fafafa',
          borderBottom: '1px solid #ddd',
          flexWrap: 'wrap',
        }}
      >
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} style={btn(editor.isActive('bold'))}>
          <strong>B</strong>
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} style={btn(editor.isActive('italic'))}>
          <em>I</em>
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} style={btn(editor.isActive('heading', { level: 2 }))}>
          H2
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} style={btn(editor.isActive('heading', { level: 3 }))}>
          H3
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} style={btn(editor.isActive('bulletList'))}>
          • List
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} style={btn(editor.isActive('orderedList'))}>
          1. List
        </button>
        <button
          type="button"
          onClick={() => {
            const url = window.prompt('URL');
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
          style={btn(editor.isActive('link'))}
        >
          Link
        </button>
        <button
          type="button"
          onClick={() => {
            const url = window.prompt('Image URL');
            if (url) editor.chain().focus().setImage({ src: url }).run();
          }}
          style={btn(false)}
        >
          Img
        </button>
      </div>
      <EditorContent
        editor={editor}
        style={{ padding: 12, minHeight, fontSize: 14, lineHeight: 1.6 }}
        data-placeholder={placeholder}
      />
    </div>
  );
}
