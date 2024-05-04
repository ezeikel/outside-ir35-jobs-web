'use client';

import { EditorProvider, useCurrentEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import {
  faBold,
  faH1,
  faH2,
  faIndent,
  faItalic,
  faLink,
  faList,
  faListOl,
  faOutdent,
  faRotateLeft,
  faRotateRight,
} from '@fortawesome/pro-regular-svg-icons';
import { Button } from '../ui/button';
// import '@/test.css';

const MenuBar = () => {
  const { editor } = useCurrentEditor();

  if (!editor) {
    return null;
  }

  return (
    <div className="flex items-center gap-x-2 border-t border-l border-r rounded-t-md bg-white p-2 overflow-x-auto">
      <Button aria-label="Undo" variant="ghost" type="button">
        <FontAwesomeIcon
          icon={faRotateLeft as IconProp}
          size="sm"
          className="text-black"
        />
      </Button>
      <Button aria-label="Redo" variant="ghost" type="button">
        <FontAwesomeIcon
          icon={faRotateRight as IconProp}
          size="sm"
          className="text-black"
        />
      </Button>
      <div className="border-l h-6" />
      <Button
        aria-label="Bold"
        variant="ghost"
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={editor.isActive('bold') ? 'is-active' : ''}
        type="button"
      >
        <FontAwesomeIcon
          icon={faBold as IconProp}
          size="sm"
          className="text-black"
        />
      </Button>
      <Button aria-label="Italic" variant="ghost" type="button">
        <FontAwesomeIcon
          icon={faItalic as IconProp}
          size="sm"
          className="text-black"
        />
      </Button>
      <Button aria-label="Heading 1" variant="ghost" type="button">
        <FontAwesomeIcon
          icon={faH1 as IconProp}
          size="sm"
          className="text-black"
        />
      </Button>
      <Button aria-label="Heading 2" variant="ghost" type="button">
        <FontAwesomeIcon
          icon={faH2 as IconProp}
          size="sm"
          className="text-black"
        />
      </Button>
      <div className="border-l h-6" />
      <Button aria-label="List" variant="ghost" type="button">
        <FontAwesomeIcon
          icon={faList as IconProp}
          size="sm"
          className="text-black"
        />
      </Button>
      <Button aria-label="Ordered List" variant="ghost" type="button">
        <FontAwesomeIcon
          icon={faListOl as IconProp}
          size="sm"
          className="text-black"
        />
      </Button>
      <Button aria-label="Indent" variant="ghost" type="button">
        <FontAwesomeIcon
          icon={faIndent as IconProp}
          size="sm"
          className="text-black"
        />
      </Button>
      <Button aria-label="Outdent" variant="ghost" type="button">
        <FontAwesomeIcon
          icon={faOutdent as IconProp}
          size="sm"
          className="text-black"
        />
      </Button>
      <div className="border-l h-6" />
      <Button aria-label="Link" variant="ghost" type="button">
        <FontAwesomeIcon
          icon={faLink as IconProp}
          size="sm"
          className="text-black"
        />
      </Button>
    </div>
  );
};

type TipTapEditorProps = {
  content: string;
  placeholder?: string;
  onChange: (content: string) => void;
};

const TipTapEditor = ({
  content,
  placeholder,
  onChange,
}: TipTapEditorProps) => {
  const extensions = [
    StarterKit,
    Placeholder.configure({
      placeholder,
    }),
  ];

  return (
    <EditorProvider
      extensions={extensions}
      content={content}
      slotBefore={<MenuBar />}
      onUpdate={({ editor }) => {
        onChange(editor.getHTML());
      }}
      editorProps={{
        attributes: {
          class:
            'flex min-h-[80px] w-full rounded-md rounded-t-none border border-input bg-slate-50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        },
      }}
    >
      {' '}
    </EditorProvider>
  );
};

export default TipTapEditor;
