"use client";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";

/**
 * Rich text editor. Markdown-style shortcuts work as you type:
 * "# " heading, "**bold**", "- " list, "1. " numbered list, "> " quote, "```" or "~~~" code block, "***" divider.
 */
export function RichEditor({ value, onChange, autoFocus }: { value: string; onChange: (html: string) => void; autoFocus?: boolean }) {
  const editor = useEditor({
    immediatelyRender: false,
    autofocus: autoFocus ? "end" : false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, autolink: true, defaultProtocol: "https", HTMLAttributes: { rel: "nofollow ugc noopener noreferrer", target: "_blank" } },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: "Write or paste here… Links, lists and headings keep their formatting." }),
    ],
    content: value,
    editorProps: { attributes: { class: "rich-content min-h-[420px] px-5 py-4 outline-none" } },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
  });

  // `value` is only the starting content; the parent remounts this component (key) to load new content.
  return (
    <div>
      {editor && <Toolbar editor={editor} />}
      <div className="max-h-[70vh] overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      code: e.isActive("code"),
      h1: e.isActive("heading", { level: 1 }),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      codeBlock: e.isActive("codeBlock"),
      link: e.isActive("link"),
      left: e.isActive({ textAlign: "left" }),
      center: e.isActive({ textAlign: "center" }),
      right: e.isActive({ textAlign: "right" }),
    }),
  });
  const c = () => editor.chain().focus();
  const B = ({ on, label, title, run }: { on?: boolean; label: React.ReactNode; title: string; run: () => void }) => (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={on}
      onMouseDown={(e) => e.preventDefault()}
      onClick={run}
      className={`flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm ${on ? "bg-magenta/20 text-rose" : "text-muted hover:bg-surface-2 hover:text-paper"}`}
    >
      {label}
    </button>
  );
  const Sep = () => <span className="mx-1 h-5 w-px bg-line" />;
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-line px-2 py-1.5">
      <B on={s.bold} title="Bold (Ctrl+B)" label={<b>B</b>} run={() => c().toggleBold().run()} />
      <B on={s.italic} title="Italic (Ctrl+I)" label={<i>I</i>} run={() => c().toggleItalic().run()} />
      <B on={s.underline} title="Underline (Ctrl+U)" label={<u>U</u>} run={() => c().toggleUnderline().run()} />
      <B on={s.strike} title="Strikethrough" label={<s>S</s>} run={() => c().toggleStrike().run()} />
      <Sep />
      <B on={s.h1} title="Heading 1" label="H1" run={() => c().toggleHeading({ level: 1 }).run()} />
      <B on={s.h2} title="Heading 2" label="H2" run={() => c().toggleHeading({ level: 2 }).run()} />
      <B on={s.h3} title="Heading 3" label="H3" run={() => c().toggleHeading({ level: 3 }).run()} />
      <Sep />
      <B on={s.bullet} title="Bulleted list" label="•" run={() => c().toggleBulletList().run()} />
      <B on={s.ordered} title="Numbered list" label="1." run={() => c().toggleOrderedList().run()} />
      <B on={s.quote} title="Quote" label="❝" run={() => c().toggleBlockquote().run()} />
      <B on={s.code} title="Inline code" label={<span className="font-mono text-xs">{"<>"}</span>} run={() => c().toggleCode().run()} />
      <B on={s.codeBlock} title="Code block" label={<span className="font-mono text-xs">{"{ }"}</span>} run={() => c().toggleCodeBlock().run()} />
      <B title="Divider" label="—" run={() => c().setHorizontalRule().run()} />
      <Sep />
      <B
        on={s.link}
        title="Link"
        label="🔗"
        run={() => {
          if (s.link) return c().unsetLink().run();
          const url = window.prompt("Link address", "https://");
          if (url && /^(https?:\/\/|mailto:)/i.test(url)) c().extendMarkRange("link").setLink({ href: url }).run();
        }}
      />
      <Sep />
      <B on={s.left} title="Align left" label="⇤" run={() => c().setTextAlign("left").run()} />
      <B on={s.center} title="Align center" label="↔" run={() => c().setTextAlign("center").run()} />
      <B on={s.right} title="Align right" label="⇥" run={() => c().setTextAlign("right").run()} />
    </div>
  );
}
