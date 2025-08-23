// -------------------- ChatProjectsSidebar.tsx --------------------
import { useEffect, useState } from "react";

type Project = { id: string; name: string; archived?: boolean };

const LS_KEY = "zandalee.chat.projects";

export default function ChatProjectsSidebar({ onSelect }: { onSelect: (p: Project) => void }) {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setProjects(JSON.parse(raw));
    } catch {}
  }, []);

  const save = (next: Project[]) => {
    setProjects(next);
    localStorage.setItem(LS_KEY, JSON.stringify(next));
  };

  const add = () => {
    const name = prompt("Project name?");
    if (!name) return;
    const p: Project = { id: crypto.randomUUID(), name };
    save([p, ...projects]);
    onSelect(p);
  };

  const archive = (id: string) => {
    save(projects.map(p => p.id === id ? { ...p, archived: true } : p));
  };

  const restore = (id: string) => {
    save(projects.map(p => p.id === id ? { ...p, archived: false } : p));
  };

  return (
    <div className="w-full md:w-72 border rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="font-semibold">Projects</div>
        <button className="text-sm underline" onClick={add}>New</button>
      </div>
      <div className="space-y-1">
        {projects.filter(p => !p.archived).map(p => (
          <button key={p.id} className="w-full text-left px-2 py-1 rounded hover:bg-accent"
                  onClick={() => onSelect(p)}>{p.name}</button>
        ))}
      </div>
      {projects.some(p => p.archived) && (
        <>
          <div className="text-xs text-muted-foreground pt-2">Archived</div>
          <div className="space-y-1">
            {projects.filter(p => p.archived).map(p => (
              <div key={p.id} className="flex items-center justify-between text-xs px-2 py-1 rounded hover:bg-accent">
                <span>{p.name}</span>
                <button className="underline" onClick={() => restore(p.id)}>Restore</button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}