"use client";

// Editor isi saat teduh (Tiptap, lengkap). Nilai keluar/masuk berupa HTML.
// Fitur: judul, tebal/miring/coret/garis bawah, kode, sub/superskrip,
// warna teks, sorotan, ukuran teks, perataan, daftar (termasuk daftar tugas),
// kutipan, blok kode, pemisah, tautan, tabel, menu gelembung saat seleksi,
// dan menu sisip saat baris kosong.

import { useEffect, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { BubbleMenu, FloatingMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder, CharacterCount } from "@tiptap/extensions";
import { TextStyleKit } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { TaskList, TaskItem } from "@tiptap/extension-list";
import { TableKit } from "@tiptap/extension-table";
import Typography from "@tiptap/extension-typography";

type Props = {
  value: string;
  onChange: (html: string) => void;
};

const TOMBOL =
  "inline-flex h-8 min-w-8 items-center justify-center rounded border border-transparent px-1.5 text-[13px] leading-none text-slate-700 transition hover:bg-slate-100 disabled:opacity-35";
const AKTIF = "border-slate-300 bg-[#9B3F76] text-white hover:bg-[#8a3568] hover:text-white";

const WARNA_TEKS = [
  { label: "Tinta", warna: "#1f2937" },
  { label: "Plum", warna: "#4a2352" },
  { label: "Ungu", warna: "#963296" },
  { label: "Merah", warna: "#c0121a" },
  { label: "Biru", warna: "#1a34c8" },
  { label: "Jingga", warna: "#a3521f" },
  { label: "Hijau", warna: "#15803d" },
  { label: "Abu", warna: "#6b7280" },
];

const WARNA_SOROT = [
  { label: "Kuning", warna: "#fde68a" },
  { label: "Hijau muda", warna: "#bbf7d0" },
  { label: "Biru muda", warna: "#bfdbfe" },
  { label: "Merah muda", warna: "#fbcfe8" },
  { label: "Ungu muda", warna: "#ddd6fe" },
  { label: "Jingga muda", warna: "#fed7aa" },
];

const UKURAN = [
  { label: "Kecil", nilai: "13px" },
  { label: "Sedang", nilai: "16px" },
  { label: "Besar", nilai: "20px" },
  { label: "Sangat besar", nilai: "26px" },
];

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
      // Cegah klik memindahkan fokus dari editor: seleksi tetap utuh sehingga
      // perintah (dan ketikan pertama sesudahnya) tidak hilang.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`${TOMBOL} ${aktif ? AKTIF : ""}`}
    >
      {children}
    </button>
  );
}

function Pisah() {
  return <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-slate-300" />;
}

/** Panel warna kecil yang muncul di bawah tombol. */
function PanelWarna({
  judul,
  warna,
  onPilih,
  onHapus,
  tutup,
}: {
  judul: string;
  warna: { label: string; warna: string }[];
  onPilih: (w: string) => void;
  onHapus?: () => void;
  tutup: () => void;
}) {
  return (
    <div
      role="menu"
      aria-label={judul}
      className="absolute left-0 top-full z-30 mt-1 w-48 rounded-lg border border-slate-200 bg-white p-2 shadow-lg"
    >
      <div className="grid grid-cols-4 gap-1.5">
        {warna.map((w) => (
          <button
            key={w.warna}
            type="button"
            title={w.label}
            aria-label={w.label}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onPilih(w.warna);
              tutup();
            }}
            className="h-7 w-7 rounded border border-slate-300 transition hover:scale-110"
            style={{ background: w.warna }}
          />
        ))}
      </div>
      <label className="mt-2 flex items-center gap-2 text-xs text-slate-500">
        Pilih warna lain
        <input
          type="color"
          aria-label={`Warna ${judul} lainnya`}
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => {
            onPilih(e.target.value);
            tutup();
          }}
          className="h-6 w-8 cursor-pointer rounded border border-slate-300 bg-white p-0"
        />
      </label>
      {onHapus && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            onHapus();
            tutup();
          }}
          className="mt-2 w-full rounded border border-slate-200 px-2 py-1.5 text-left text-xs text-slate-600 hover:bg-slate-50"
        >
          Hapus warna
        </button>
      )}
    </div>
  );
}

export default function BodyEditor({ value, onChange }: Props) {
  const [panel, setPanel] = useState<null | "teks" | "sorot" | "ukuran">(null);
  const [tautanBuka, setTautanBuka] = useState(false);
  const [urlTautan, setUrlTautan] = useState("");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, autolink: true, protocols: ["http", "https", "mailto"] },
      }),
      TextStyleKit.configure({
        fontFamily: false,
        lineHeight: false,
        backgroundColor: false, // sorotan memakai Highlight, bukan backgroundColor
        fontSize: {},
        color: {},
      }),
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
        alignments: ["left", "center", "right", "justify"],
      }),
      Subscript,
      Superscript,
      TaskList,
      TaskItem.configure({ nested: true }),
      TableKit.configure({ table: { resizable: false } }),
      Typography,
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

  const chain = () => editor?.chain().focus();
  const dalamTabel = !!editor?.isActive("table");
  const adaTautan = !!editor?.isActive("link");

  function bukaTautan() {
    if (!editor) return;
    setUrlTautan(editor.getAttributes("link").href ?? "");
    setTautanBuka(true);
  }

  function simpanTautan() {
    if (!editor) return;
    const url = urlTautan.trim();
    setTautanBuka(false);
    if (!url) {
      chain()?.unsetLink().run();
      return;
    }
    if (editor.state.selection.empty) {
      chain()
        ?.insertContent(`<a href="${url.replace(/"/g, "&quot;")}">${url}</a>`)
        .run();
    } else {
      chain()?.setLink({ href: url }).run();
    }
    setUrlTautan("");
  }

  const kata = editor?.storage.characterCount?.words?.() ?? 0;
  const huruf = editor?.storage.characterCount?.characters?.() ?? 0;

  return (
    <div className="relative">
      {/* ---- Toolbar utama ---- */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-2 py-2">
        {/* Blok */}
        <Tombol
          editor={editor}
          judul="Paragraf"
          aktif={!!editor?.isActive("paragraph") && !editor?.isActive("heading")}
          onClick={() => chain()?.setParagraph().run()}
        >
          ¶
        </Tombol>
        <Tombol
          editor={editor}
          judul="Judul 1"
          aktif={editor?.isActive("heading", { level: 1 })}
          onClick={() => chain()?.toggleHeading({ level: 1 }).run()}
        >
          H1
        </Tombol>
        <Tombol
          editor={editor}
          judul="Judul 2"
          aktif={editor?.isActive("heading", { level: 2 })}
          onClick={() => chain()?.toggleHeading({ level: 2 }).run()}
        >
          H2
        </Tombol>
        <Tombol
          editor={editor}
          judul="Judul 3"
          aktif={editor?.isActive("heading", { level: 3 })}
          onClick={() => chain()?.toggleHeading({ level: 3 }).run()}
        >
          H3
        </Tombol>

        <Pisah />

        {/* Format inline */}
        <Tombol
          editor={editor}
          judul="Tebal (Ctrl+B)"
          aktif={editor?.isActive("bold")}
          onClick={() => chain()?.toggleBold().run()}
        >
          <strong>B</strong>
        </Tombol>
        <Tombol
          editor={editor}
          judul="Miring (Ctrl+I)"
          aktif={editor?.isActive("italic")}
          onClick={() => chain()?.toggleItalic().run()}
        >
          <em>I</em>
        </Tombol>
        <Tombol
          editor={editor}
          judul="Coret (Ctrl+Shift+S)"
          aktif={editor?.isActive("strike")}
          onClick={() => chain()?.toggleStrike().run()}
        >
          <s>S</s>
        </Tombol>
        <Tombol
          editor={editor}
          judul="Garis bawah (Ctrl+U)"
          aktif={editor?.isActive("underline")}
          onClick={() => chain()?.toggleUnderline().run()}
        >
          <span className="underline">U</span>
        </Tombol>
        <Tombol
          editor={editor}
          judul="Kode"
          aktif={editor?.isActive("code")}
          onClick={() => chain()?.toggleCode().run()}
        >
          {"</>"}
        </Tombol>
        <Tombol
          editor={editor}
          judul="Subskrip"
          aktif={editor?.isActive("subscript")}
          onClick={() => chain()?.toggleSubscript().run()}
        >
          X₂
        </Tombol>
        <Tombol
          editor={editor}
          judul="Superskrip"
          aktif={editor?.isActive("superscript")}
          onClick={() => chain()?.toggleSuperscript().run()}
        >
          X²
        </Tombol>

        <Pisah />

        {/* Warna & ukuran */}
        <div className="relative">
          <button
            type="button"
            title="Warna teks"
            aria-label="Warna teks"
            aria-expanded={panel === "teks"}
            disabled={!editor}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setPanel(panel === "teks" ? null : "teks")}
            className={`${TOMBOL} ${panel === "teks" ? AKTIF : ""}`}
          >
            <span className="flex flex-col items-center leading-none">
              A
              <span
                aria-hidden
                className="mt-0.5 h-1 w-4 rounded-sm"
                style={{
                  background: editor?.getAttributes("textStyle").color || "#1f2937",
                }}
              />
            </span>
          </button>
          {panel === "teks" && (
            <PanelWarna
              judul="Warna teks"
              warna={WARNA_TEKS}
              onPilih={(w) => chain()?.setColor(w).run()}
              onHapus={() => chain()?.unsetColor().run()}
              tutup={() => setPanel(null)}
            />
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            title="Sorotan"
            aria-label="Sorotan"
            aria-expanded={panel === "sorot"}
            disabled={!editor}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setPanel(panel === "sorot" ? null : "sorot")}
            className={`${TOMBOL} ${panel === "sorot" ? AKTIF : ""}`}
          >
            🖍
          </button>
          {panel === "sorot" && (
            <PanelWarna
              judul="Sorotan"
              warna={WARNA_SOROT}
              onPilih={(w) => chain()?.setHighlight({ color: w }).run()}
              onHapus={() => chain()?.unsetHighlight().run()}
              tutup={() => setPanel(null)}
            />
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            title="Ukuran teks"
            aria-label="Ukuran teks"
            aria-expanded={panel === "ukuran"}
            disabled={!editor}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setPanel(panel === "ukuran" ? null : "ukuran")}
            className={`${TOMBOL} ${panel === "ukuran" ? AKTIF : ""}`}
          >
            Aa▾
          </button>
          {panel === "ukuran" && (
            <div
              role="menu"
              aria-label="Ukuran teks"
              className="absolute left-0 top-full z-30 mt-1 w-40 rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
            >
              {UKURAN.map((u) => (
                <button
                  key={u.nilai}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    chain()?.setFontSize(u.nilai).run();
                    setPanel(null);
                  }}
                  className="block w-full rounded px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100"
                >
                  <span style={{ fontSize: u.nilai }}>{u.label}</span>
                </button>
              ))}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  chain()?.unsetFontSize().run();
                  setPanel(null);
                }}
                className="block w-full rounded px-2 py-1.5 text-left text-xs text-slate-500 hover:bg-slate-100"
              >
                Ukuran normal
              </button>
            </div>
          )}
        </div>

        <Pisah />

        {/* Perataan */}
        <Tombol
          editor={editor}
          judul="Rata kiri"
          aktif={editor?.isActive({ textAlign: "left" })}
          onClick={() => chain()?.setTextAlign("left").run()}
        >
          ⇤
        </Tombol>
        <Tombol
          editor={editor}
          judul="Rata tengah"
          aktif={editor?.isActive({ textAlign: "center" })}
          onClick={() => chain()?.setTextAlign("center").run()}
        >
          ↔
        </Tombol>
        <Tombol
          editor={editor}
          judul="Rata kanan"
          aktif={editor?.isActive({ textAlign: "right" })}
          onClick={() => chain()?.setTextAlign("right").run()}
        >
          ⇥
        </Tombol>
        <Tombol
          editor={editor}
          judul="Rata dua sisi"
          aktif={editor?.isActive({ textAlign: "justify" })}
          onClick={() => chain()?.setTextAlign("justify").run()}
        >
          ≡
        </Tombol>

        <Pisah />

        {/* Daftar */}
        <Tombol
          editor={editor}
          judul="Daftar butir"
          aktif={editor?.isActive("bulletList")}
          onClick={() => chain()?.toggleBulletList().run()}
        >
          •
        </Tombol>
        <Tombol
          editor={editor}
          judul="Daftar bernomor"
          aktif={editor?.isActive("orderedList")}
          onClick={() => chain()?.toggleOrderedList().run()}
        >
          1.
        </Tombol>
        <Tombol
          editor={editor}
          judul="Daftar tugas"
          aktif={editor?.isActive("taskList")}
          onClick={() => chain()?.toggleTaskList().run()}
        >
          ☑
        </Tombol>

        <Pisah />

        {/* Blok */}
        <Tombol
          editor={editor}
          judul="Kutipan"
          aktif={editor?.isActive("blockquote")}
          onClick={() => chain()?.toggleBlockquote().run()}
        >
          ❝
        </Tombol>
        <Tombol
          editor={editor}
          judul="Blok kode (Ctrl+Alt+C)"
          aktif={editor?.isActive("codeBlock")}
          onClick={() => chain()?.toggleCodeBlock().run()}
        >
          {"{ }"}
        </Tombol>
        <Tombol
          editor={editor}
          judul="Garis pemisah"
          onClick={() => chain()?.setHorizontalRule().run()}
        >
          —
        </Tombol>

        <Pisah />

        {/* Tautan */}
        <div className="relative">
          <Tombol
            editor={editor}
            judul="Tautan"
            aktif={adaTautan || tautanBuka}
            onClick={bukaTautan}
          >
            🔗
          </Tombol>
          {tautanBuka && (
            <div
              role="dialog"
              aria-label="Tautan"
              className="absolute left-0 top-full z-30 mt-1 w-64 rounded-lg border border-slate-200 bg-white p-2 shadow-lg"
            >
              <input
                autoFocus
                type="url"
                value={urlTautan}
                onChange={(e) => setUrlTautan(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    simpanTautan();
                  }
                  if (e.key === "Escape") setTautanBuka(false);
                }}
                placeholder="https://…"
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={simpanTautan}
                  className="flex-1 rounded bg-[#9B3F76] px-2 py-1.5 text-xs text-white"
                >
                  Pasang
                </button>
                {adaTautan && (
                  <button
                    type="button"
                    onClick={() => {
                      chain()?.unsetLink().run();
                      setTautanBuka(false);
                    }}
                    className="rounded border border-slate-300 px-2 py-1.5 text-xs text-slate-600"
                  >
                    Hapus
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setTautanBuka(false)}
                  className="rounded border border-slate-300 px-2 py-1.5 text-xs text-slate-600"
                >
                  Batal
                </button>
              </div>
            </div>
          )}
        </div>

        <Pisah />

        {/* Tabel */}
        <Tombol
          editor={editor}
          judul="Sisipkan tabel 3×3"
          onClick={() => chain()?.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        >
          ▦
        </Tombol>
        {dalamTabel && (
          <>
            <Tombol
              editor={editor}
              judul="Tambah baris"
              onClick={() => chain()?.addRowAfter().run()}
            >
              +baris
            </Tombol>
            <Tombol
              editor={editor}
              judul="Tambah kolom"
              onClick={() => chain()?.addColumnAfter().run()}
            >
              +kolom
            </Tombol>
            <Tombol
              editor={editor}
              judul="Jadikan baris judul"
              aktif={editor?.isActive("tableHeader")}
              onClick={() => chain()?.toggleHeaderRow().run()}
            >
              judul
            </Tombol>
            <Tombol
              editor={editor}
              judul="Hapus tabel"
              onClick={() => chain()?.deleteTable().run()}
            >
              hapus
            </Tombol>
          </>
        )}

        <Pisah />

        {/* Aksi */}
        <Tombol editor={editor} judul="Urungkan (Ctrl+Z)" onClick={() => chain()?.undo().run()}>
          ↶
        </Tombol>
        <Tombol
          editor={editor}
          judul="Ulangi (Ctrl+Shift+Z)"
          onClick={() => chain()?.redo().run()}
        >
          ↷
        </Tombol>
        <Tombol
          editor={editor}
          judul="Hapus format"
          onClick={() => chain()?.unsetAllMarks().clearNodes().run()}
        >
          ⌫
        </Tombol>
      </div>

      {/* ---- Isi ---- */}
      <EditorContent editor={editor} />

      {/* ---- Menu gelembung saat teks diseleksi ---- */}
      {editor && (
        <BubbleMenu
          editor={editor}
          options={{ placement: "top", offset: 6 }}
          className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white px-1.5 py-1 shadow-lg"
        >
          <Tombol
            editor={editor}
            judul="Tebal"
            aktif={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <strong>B</strong>
          </Tombol>
          <Tombol
            editor={editor}
            judul="Miring"
            aktif={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <em>I</em>
          </Tombol>
          <Tombol
            editor={editor}
            judul="Coret"
            aktif={editor.isActive("strike")}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <s>S</s>
          </Tombol>
          <Tombol
            editor={editor}
            judul="Garis bawah"
            aktif={editor.isActive("underline")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <span className="underline">U</span>
          </Tombol>
          <Tombol
            editor={editor}
            judul="Sorot"
            aktif={editor.isActive("highlight")}
            onClick={() => editor.chain().focus().setHighlight({ color: "#fde68a" }).run()}
          >
            🖍
          </Tombol>
          <Tombol
            editor={editor}
            judul="Tautan"
            aktif={editor.isActive("link")}
            onClick={bukaTautan}
          >
            🔗
          </Tombol>
          <Tombol
            editor={editor}
            judul="Hapus format"
            onClick={() => editor.chain().focus().unsetAllMarks().run()}
          >
            ⌫
          </Tombol>
        </BubbleMenu>
      )}

      {/* ---- Menu sisip saat baris kosong ---- */}
      {editor && (
        <FloatingMenu
          editor={editor}
          options={{ placement: "bottom-start", offset: 4 }}
          className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white px-1.5 py-1 shadow-lg"
        >
          <Tombol
            editor={editor}
            judul="Judul 1"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          >
            H1
          </Tombol>
          <Tombol
            editor={editor}
            judul="Judul 2"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            H2
          </Tombol>
          <Tombol
            editor={editor}
            judul="Daftar butir"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            •
          </Tombol>
          <Tombol
            editor={editor}
            judul="Daftar bernomor"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            1.
          </Tombol>
          <Tombol
            editor={editor}
            judul="Kutipan"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            ❝
          </Tombol>
          <Tombol
            editor={editor}
            judul="Blok kode"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          >
            {"{ }"}
          </Tombol>
          <Tombol
            editor={editor}
            judul="Tabel 3×3"
            onClick={() =>
              editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
            }
          >
            ▦
          </Tombol>
          <Tombol
            editor={editor}
            judul="Garis pemisah"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
          >
            —
          </Tombol>
        </FloatingMenu>
      )}

      {/* ---- Kaki toolbar: hitungan ---- */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-3 py-2">
        <p className="text-xs text-slate-500">
          Rujukan ayat (mis. <em>Yohanes 3:16</em>, <em>Mzm 23</em>) otomatis jadi tautan yang
          bisa diklik pembaca.
        </p>
        <p className="text-xs tabular-nums text-slate-500">
          {kata} kata · {huruf} karakter
        </p>
      </div>
    </div>
  );
}
