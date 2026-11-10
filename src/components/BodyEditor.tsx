"use client";

// Editor isi saat teduh (Tiptap). Nilai keluar/masuk berupa HTML.
// Tombol "Sisipkan rujukan ayat" menyisipkan teks rujukan biasa, dan sisipan itu
// otomatis menjadi tautan yang membuka ayat — sama seperti rujukan yang diketik manual.

import { useEffect } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder, CharacterCount } from "@tiptap/extensions";

type Props = {
  value: string;
  onChange: (html: string) => void;
};

const TOMBOL =
  "rounded border border-slate-300 bg-white px-2.5 py-1 text-[13px] leading-5 text-slate-700 transition hover:bg-slate-100 disabled:opacity-40";

function Tombol({
  editor,
  aktif,
  judul,
  onClick,
  children,
}: {
  editor: Editor | null;
  aktif?: boolean;
  judul: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={judul}
      aria-label={judul}
      aria-pressed={aktif}
      disabled={!editor}
      onClick={onClick}
      className={`${TOMBOL} ${aktif ? "bg-[#9B3F76] text-white hover:bg-[#8a3568]" : ""}`}
    >
      {children}
    </button>
  );
}

export default function BodyEditor({ value, onChange }: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: false },
      }),
      Placeholder.configure({
        placeholder:
          "Tulis isi saat teduh… Rujukan ayat seperti Yohanes 3:16 otomatis menjadi tautan.",
      }),
      CharacterCount,
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: "isi-editor",
        "aria-label": "Isi saat teduh",
      },
    },
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML();
      onChange(html === "<p></p>" ? "" : html);
    },
  });

  // Nilai dari luar (mis. saat memuat data lama) — jangan timpa saat mengetik.
  useEffect(() => {
    if (!editor) return;
    if (value === editor.getHTML()) return;
    editor.commands.setContent(value || "", { emitUpdate: false });
  }, [editor, value]);

  const blok = () => editor?.chain().focus();

  return (
    <div className="rounded border border-slate-300 bg-white">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-2 py-2">
        <Tombol
          editor={editor}
          judul="Tebal"
          aktif={editor?.isActive("bold")}
          onClick={() => blok()?.toggleBold().run()}
        >
          <strong>B</strong>
        </Tombol>
        <Tombol
          editor={editor}
          judul="Miring"
          aktif={editor?.isActive("italic")}
          onClick={() => blok()?.toggleItalic().run()}
        >
          <em>I</em>
        </Tombol>
        <Tombol
          editor={editor}
          judul="Garis bawah"
          aktif={editor?.isActive("underline")}
          onClick={() => blok()?.toggleUnderline().run()}
        >
          <span className="underline">U</span>
        </Tombol>
        <span className="mx-1 h-5 w-px bg-slate-300" />
        <Tombol
          editor={editor}
          judul="Subjudul"
          aktif={editor?.isActive("heading", { level: 2 })}
          onClick={() => blok()?.toggleHeading({ level: 2 }).run()}
        >
          H2
        </Tombol>
        <Tombol
          editor={editor}
          judul="Subjudul kecil"
          aktif={editor?.isActive("heading", { level: 3 })}
          onClick={() => blok()?.toggleHeading({ level: 3 }).run()}
        >
          H3
        </Tombol>
        <Tombol
          editor={editor}
          judul="Daftar bernomor"
          aktif={editor?.isActive("orderedList")}
          onClick={() => blok()?.toggleOrderedList().run()}
        >
          1.
        </Tombol>
        <Tombol
          editor={editor}
          judul="Daftar butir"
          aktif={editor?.isActive("bulletList")}
          onClick={() => blok()?.toggleBulletList().run()}
        >
          •
        </Tombol>
        <Tombol
          editor={editor}
          judul="Kutipan"
          aktif={editor?.isActive("blockquote")}
          onClick={() => blok()?.toggleBlockquote().run()}
        >
          ❝
        </Tombol>
        <Tombol
          editor={editor}
          judul="Garis pemisah"
          onClick={() => blok()?.setHorizontalRule().run()}
        >
          —
        </Tombol>
        <span className="mx-1 h-5 w-px bg-slate-300" />
        <Tombol
          editor={editor}
          judul="Urungkan"
          onClick={() => blok()?.undo().run()}
        >
          ↶
        </Tombol>
        <Tombol
          editor={editor}
          judul="Ulangi"
          onClick={() => blok()?.redo().run()}
        >
          ↷
        </Tombol>
        <Tombol
          editor={editor}
          judul="Hapus format"
          onClick={() => blok()?.unsetAllMarks().clearNodes().run()}
        >
          ⌫
        </Tombol>
      </div>

      <EditorContent editor={editor} />

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-3 py-2">
        <p className="text-xs text-slate-500">
          Rujukan ayat (mis. <em>Yohanes 3:16</em>, <em>Mzm 23</em>) otomatis jadi tautan
          yang bisa diklik pembaca.
        </p>
        <p className="text-xs text-slate-500">
          {editor ? editor.storage.characterCount?.words?.() ?? "" : ""}
        </p>
      </div>
    </div>
  );
}
