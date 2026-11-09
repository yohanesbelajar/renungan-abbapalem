import DevotionForm from "@/components/DevotionForm";


export const dynamic = "force-dynamic";

export default function NewDevotionPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900">Tulis Saat Teduh Baru</h1>
      <div className="mt-4">
        <DevotionForm />
      </div>
    </div>
  );
}
