"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Script = { id: number; title: string; text: string };

export default function LibraryPage() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const router = useRouter();
  useEffect(() => {
    try {
      const raw = localStorage.getItem("tp:scripts");
      if (raw) setScripts(JSON.parse(raw));
    } catch {}
  }, []);
  const load = (s: Script) => {
    try { localStorage.setItem("tp:currentScript", s.text); } catch {}
    router.push("/");
  };
  const remove = (id: number) => {
    const next = scripts.filter((s) => s.id !== id);
    setScripts(next);
    try { localStorage.setItem("tp:scripts", JSON.stringify(next)); } catch {}
  };
  return (
    <div className="py-6 space-y-4">
      <h1 className="text-2xl font-semibold">Script Library</h1>
      {scripts.length === 0 && <p>No saved scripts.</p>}
      <ul className="space-y-2">
        {scripts.map((s) => (
          <li key={s.id} className="card px-4 py-3 flex items-center justify-between">
            <span className="font-medium">{s.title}</span>
            <div className="flex gap-2">
              <button className="btn btn-primary text-sm" onClick={() => load(s)}>Load</button>
              <button className="btn btn-danger text-sm" onClick={() => remove(s.id)}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
