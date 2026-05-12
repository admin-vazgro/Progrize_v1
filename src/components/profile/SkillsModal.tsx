"use client";

import { useState } from "react";
import { X, Loader2, Plus } from "lucide-react";

interface Props {
  skills: string[];
  onUpdate: (skills: string[]) => void;
  onClose: () => void;
}

export default function SkillsModal({ skills: initial, onUpdate, onClose }: Props) {
  const [skills, setSkills] = useState<string[]>(initial);
  const [input, setInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function addSkill() {
    const name = input.trim();
    if (!name) return;
    if (skills.some((s) => s.toLowerCase() === name.toLowerCase())) {
      setInput("");
      return;
    }
    setAdding(true);
    setError(null);
    const res = await fetch("/api/profile/skills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skill: name }),
    });
    const data = await res.json();
    setAdding(false);
    if (!res.ok) { setError(data.error); return; }
    const updated = [...skills, data.skill];
    setSkills(updated);
    onUpdate(updated);
    setInput("");
  }

  async function removeSkill(skill: string) {
    setRemoving(skill);
    setError(null);
    const res = await fetch("/api/profile/skills", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skill }),
    });
    setRemoving(null);
    if (!res.ok) { setError("Failed to remove skill"); return; }
    const updated = skills.filter((s) => s !== skill);
    setSkills(updated);
    onUpdate(updated);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") { e.preventDefault(); addSkill(); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-[20px] w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="text-[18px] font-bold text-[#0a2412]">Manage skills</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-[#e8e8e8] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-[#292929]" />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {/* Add skill input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a skill (e.g. React, Figma, Python)"
              className="flex-1 px-4 py-2.5 rounded-[10px] bg-[#f8fafb] text-[#292929] text-sm placeholder:text-[#4b4b4b] outline-none"
            />
            <button
              onClick={addSkill}
              disabled={adding || !input.trim()}
              className="px-4 py-2.5 rounded-[10px] bg-[#0a2412] text-[#dee2df] text-sm font-medium hover:bg-[#0a2412]/90 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
            >
              {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Add
            </button>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* Skills list */}
          {skills.length === 0 ? (
            <p className="text-sm text-[#4b4b4b] text-center py-6">No skills added yet. Type one above!</p>
          ) : (
            <div className="flex flex-wrap gap-2 max-h-[280px] overflow-y-auto py-1">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-[10px] bg-[#e8e8e8] text-[#292929] group"
                >
                  {skill}
                  <button
                    onClick={() => removeSkill(skill)}
                    disabled={removing === skill}
                    className="text-[#4b4b4b] hover:text-red-500 transition-colors ml-0.5"
                  >
                    {removing === skill ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <X className="w-3 h-3" />
                    )}
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-[10px] text-sm bg-[#0a2412] text-[#dee2df] font-medium hover:bg-[#0a2412]/90 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
