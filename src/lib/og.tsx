// Pembuat kartu bagikan (Open Graph) 1200×630 — dipakai halaman edisi dan
// halaman topik. Tanpa dependensi tambahan: next/og (satori) sudah ikut Next.
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const OG_SIZE = { width: 1200, height: 630 };

let cacheGambar: { ikon: string; logo: string } | null = null;

async function gambar() {
  if (cacheGambar) return cacheGambar;
  const baca = async (berkas: string) =>
    `data:image/png;base64,${(await readFile(path.join(process.cwd(), "public", berkas))).toString("base64")}`;
  cacheGambar = { ikon: await baca("logo-palem.png"), logo: await baca("logo-abbalove.png") };
  return cacheGambar;
}

function potong(teks: string, maks: number): string {
  const t = teks.trim();
  return t.length <= maks ? t : `${t.slice(0, maks - 1).trimEnd()}…`;
}

/** Kartu untuk satu edisi saat teduh. */
export async function kartuEdisi({
  judul,
  tema,
  tanggal,
}: {
  judul: string;
  tema?: string | null;
  tanggal?: string;
}) {
  const { ikon, logo } = await gambar();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(150deg,#0b0710 0%,#1b1024 52%,#2a1330 100%)",
          padding: "58px 62px",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: -140,
            top: -160,
            width: 620,
            height: 620,
            borderRadius: 310,
            background: "radial-gradient(circle,rgba(150,50,150,0.55) 0%,rgba(150,50,150,0) 70%)",
            display: "flex",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt="" width={190} height={52} style={{ borderRadius: 8 }} />
          <span style={{ color: "rgba(243,236,248,0.72)", fontSize: 24 }}>
            Saat Teduh — Palem
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {tema ? (
            <span
              style={{
                alignSelf: "flex-start",
                fontSize: 26,
                fontWeight: 600,
                color: "#f7c274",
                letterSpacing: 0.5,
              }}
            >
              {potong(tema, 48)}
            </span>
          ) : null}
          <div
            style={{
              fontSize: judul.length > 58 ? 58 : 68,
              fontWeight: 700,
              lineHeight: 1.16,
              color: "#fdf9f3",
              letterSpacing: -1.2,
              maxWidth: 1000,
            }}
          >
            {potong(judul, 120)}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(243,236,248,0.16)",
            paddingTop: 22,
          }}
        >
          <span style={{ color: "rgba(243,236,248,0.66)", fontSize: 24 }}>{tanggal ?? ""}</span>
          <span style={{ color: "#e08a00", fontSize: 24, fontWeight: 600 }}>sate-alpalem.xyz</span>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ikon}
          alt=""
          width={168}
          height={168}
          style={{ position: "absolute", right: 54, bottom: 108, opacity: 0.95 }}
        />
      </div>
    ),
    OG_SIZE
  );
}

/** Kartu untuk satu halaman topik. */
export async function kartuTopik({
  tema,
  jumlah,
  rentang,
}: {
  tema: string;
  jumlah: number;
  rentang: string;
}) {
  const { ikon, logo } = await gambar();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(140deg,#0b0710 0%,#20112a 55%,#33163a 100%)",
          padding: "58px 62px",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: -120,
            bottom: -200,
            width: 600,
            height: 600,
            borderRadius: 300,
            background: "radial-gradient(circle,rgba(224,138,0,0.35) 0%,rgba(224,138,0,0) 70%)",
            display: "flex",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt="" width={190} height={52} style={{ borderRadius: 8 }} />
          <span style={{ color: "rgba(243,236,248,0.72)", fontSize: 24 }}>Topik Saat Teduh</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <span style={{ fontSize: 30, color: "#f7c274", fontWeight: 600 }}>
            {jumlah} saat teduh
          </span>
          <div
            style={{
              fontSize: tema.length > 22 ? 64 : 84,
              fontWeight: 700,
              lineHeight: 1.1,
              color: "#fdf9f3",
              letterSpacing: -1.6,
              maxWidth: 900,
            }}
          >
            {potong(tema, 60)}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ color: "rgba(243,236,248,0.66)", fontSize: 24 }}>{rentang}</span>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ikon}
          alt=""
          width={190}
          height={190}
          style={{ position: "absolute", right: 46, bottom: 96, opacity: 0.95 }}
        />
      </div>
    ),
    OG_SIZE
  );
}
