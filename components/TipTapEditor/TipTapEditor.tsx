'use client';

import { useCallback } from 'react';
import { mergeAttributes } from '@tiptap/core';
import { EditorProvider, useCurrentEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import BaseHeading from '@tiptap/extension-heading';
import Link from '@tiptap/extension-link';
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
import cn from '@/utils/cn';
import { Button } from '../ui/button';
import { Indent } from './indent';

type Levels = 1 | 2;

const classes: Record<Levels, string> = {
  1: 'text-4xl font-bold',
  2: 'text-3xl font-semibold',
};

const MenuBar = () => {
  const { editor } = useCurrentEditor();

  const setLink = useCallback(() => {
    const previousUrl = editor?.getAttributes('link').href;
    // eslint-disable-next-line no-alert
    const url = window.prompt('URL', previousUrl);

    // cancelled
    if (url === null) {
      return;
    }

    // empty
    if (url === '') {
      editor?.chain().focus().extendMarkRange('link').unsetLink().run();

      return;
    }

    // update link
    editor
      ?.chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: url })
      .run();
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="flex items-center gap-x-2 border-t border-l border-r rounded-t-md bg-white p-2 overflow-x-auto">
      <Button
        aria-label="Undo"
        variant="ghost"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        type="button"
      >
        <FontAwesomeIcon
          icon={faRotateLeft as IconProp}
          size="sm"
          className={cn('text-black', {
            'opacity-50': !editor.can().undo(),
          })}
        />
      </Button>
      <Button
        aria-label="Redo"
        variant="ghost"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        type="button"
      >
        <FontAwesomeIcon
          icon={faRotateRight as IconProp}
          size="sm"
          className={cn('text-black', {
            'opacity-50': !editor.can().redo(),
          })}
        />
      </Button>
      <div className="border-l h-6" />
      <Button
        aria-label="Bold"
        variant="ghost"
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={editor.isActive('bold') ? 'bg-gray-300' : ''}
        type="button"
      >
        <FontAwesomeIcon
          icon={faBold as IconProp}
          size="sm"
          className="text-black"
        />
      </Button>
      <Button
        aria-label="Italic"
        variant="ghost"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={editor.isActive('italic') ? 'italic' : ''}
        type="button"
      >
        <FontAwesomeIcon
          icon={faItalic as IconProp}
          size="sm"
          className="text-black"
        />
      </Button>
      <Button
        aria-label="Heading 1"
        variant="ghost"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={
          editor.isActive('heading', { level: 1 }) ? 'bg-gray-300' : ''
        }
        type="button"
      >
        <FontAwesomeIcon
          icon={faH1 as IconProp}
          size="sm"
          className="text-black"
        />
      </Button>
      <Button
        aria-label="Heading 2"
        variant="ghost"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        type="button"
      >
        <FontAwesomeIcon
          icon={faH2 as IconProp}
          size="sm"
          className="text-black"
        />
      </Button>
      <div className="border-l h-6" />
      <Button
        aria-label="List"
        variant="ghost"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={editor.isActive('bulletList') ? 'bg-gray-300' : ''}
        type="button"
      >
        <FontAwesomeIcon
          icon={faList as IconProp}
          size="sm"
          className="text-black"
        />
      </Button>
      <Button
        aria-label="Ordered List"
        variant="ghost"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={editor.isActive('orderedList') ? 'bg-gray-300' : ''}
        type="button"
      >
        <FontAwesomeIcon
          icon={faListOl as IconProp}
          size="sm"
          className="text-black"
        />
      </Button>
      <Button
        aria-label="Indent"
        variant="ghost"
        // TODO: Investigate why there are type errors for usage of indent and outdent not existing on SingleCommands - https://github.com/ueberdosis/tiptap/issues/3579
        // @ts-ignore: Property 'indent' does not exist on type 'SingleCommands'.
        onClick={() => editor.commands.indent()}
        type="button"
      >
        <FontAwesomeIcon
          icon={faIndent as IconProp}
          size="sm"
          className="text-black"
        />
      </Button>
      <Button
        aria-label="Outdent"
        variant="ghost"
        // TODO: Investigate why there are type errors for usage of indent and outdent not existing on SingleCommands - https://github.com/ueberdosis/tiptap/issues/3579
        // @ts-ignore: Property 'outdent' does not exist on type 'SingleCommands'.
        onClick={() => editor.commands.outdent()}
        type="button"
      >
        <FontAwesomeIcon
          icon={faOutdent as IconProp}
          size="sm"
          className="text-black"
        />
      </Button>
      <div className="border-l h-6" />
      <Button
        aria-label="Link"
        variant="ghost"
        onClick={() => {
          if (editor.isActive('link')) {
            editor.chain().focus().unsetLink().run();
          } else {
            setLink();
          }
        }}
        type="button"
      >
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
    StarterKit.configure({
      heading: false,
    }),
    Placeholder.configure({
      placeholder,
      emptyEditorClass: 'is-editor-empty',
    }),
    BaseHeading.configure({
      levels: [1, 2],
    }).extend({
      renderHTML({ node, HTMLAttributes }) {
        // eslint-disable-next-line react/no-this-in-sfc
        const hasLevel = this.options.levels.includes(node.attrs.level);
        const level = hasLevel
          ? (node.attrs.level as string)
          : // eslint-disable-next-line react/no-this-in-sfc
            this.options.levels[0];

        return [
          `h${level}`,
          // eslint-disable-next-line react/no-this-in-sfc
          mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
            class: `${classes[level as Levels]}`,
          }),
          0,
        ];
      },
    }),
    Indent.configure({
      types: ['listItem', 'paragraph'],
      minLevel: 0,
      maxLevel: 8,
    }),
    Link.configure({
      protocols: ['ftp', 'mailto'],
      validate: (href) => /^https?:\/\//.test(href),
      HTMLAttributes: {
        rel: 'noopener noreferrer',
      },
    }),
  ];

  return (
    <EditorProvider
      // @ts-ignore: Types of property 'editor' are incompatible.
      extensions={extensions}
      content={content}
      slotBefore={<MenuBar />}
      onUpdate={({ editor }) => {
        onChange(editor.getHTML());
      }}
      editorProps={{
        attributes: {
          class:
            'min-h-[80px] w-full rounded-md rounded-t-none border border-input bg-slate-50 p-4 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        },
      }}
    >
      {' '}
    </EditorProvider>
  );
};

export default TipTapEditor;
