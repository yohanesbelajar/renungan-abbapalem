// Pembantu tampilan halaman grup (bukan logika data).
// Inisial dipakai untuk lingkaran kecil pengganti foto profil.
export function inisial(nama: string): string {
  const bagian = nama.trim().split(/\s+/).filter(Boolean);
  if (bagian.length === 0) return "?";
  if (bagian.length === 1) return bagian[0].slice(0, 2).toUpperCase();
  return (bagian[0][0] + bagian[bagian.length - 1][0]).toUpperCase();
}

export const HARI_SINGKAT = ["M", "S", "S", "R", "K", "J", "S"];
