"use client";

import { useState, useEffect } from "react";
import { Users, Plus, Loader2, Lock } from "lucide-react";
import Link from "next/link";

interface Room {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_private: boolean;
  member_count: number;
  post_count: number;
  is_joined: boolean;
}

interface Props {
  onEnterRoom: () => void;
}

export default function RoomsTab({ onEnterRoom: _onEnterRoom }: Props) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", is_private: false });
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/rooms")
      .then((r) => r.json())
      .then((d) => setRooms(d.rooms ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function handleJoin(room: Room) {
    setJoiningId(room.id);
    const res = await fetch(`/api/rooms/${room.slug}/join`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setRooms((prev) =>
        prev.map((r) =>
          r.id === room.id
            ? { ...r, is_joined: data.joined, member_count: r.member_count + (data.joined ? 1 : -1) }
            : r
        )
      );
    }
    setJoiningId(null);
  }

  async function handleCreate() {
    if (!form.name.trim()) return;
    setCreating(true);
    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) {
      setRooms((prev) => [{ ...data.room, is_joined: true }, ...prev]);
      setShowCreate(false);
      setForm({ name: "", description: "", is_private: false });
    }
    setCreating(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#4b4b4b]">Topic-based spaces to connect with focused communities.</p>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-[#c1cc5a] text-[#0a2412] text-sm font-medium hover:bg-[#c1cc5a]/90 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Create room
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-white rounded-[20px] p-5 space-y-3">
          <h3 className="text-sm font-bold text-[#0a2412]">New room</h3>
          <div>
            <label className="text-xs font-medium text-[#292929] mb-1.5 block">Room name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. UX Designers"
              className="w-full px-4 py-2.5 rounded-[10px] bg-[#f8fafb] text-[#292929] text-sm placeholder:text-[#4b4b4b] outline-none transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[#292929] mb-1.5 block">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="What is this room about?"
              rows={2}
              className="w-full px-4 py-2.5 rounded-[10px] bg-[#f8fafb] text-[#292929] text-sm placeholder:text-[#4b4b4b] outline-none resize-none transition-colors"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-[#292929]">
            <input
              type="checkbox"
              checked={form.is_private}
              onChange={(e) => setForm((f) => ({ ...f, is_private: e.target.checked }))}
              className="rounded"
            />
            Private room (invite only)
          </label>
          <div className="flex gap-2 justify-end pt-1">
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-[10px] text-sm text-[#292929] hover:bg-[#e8e8e8] transition-colors">
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !form.name.trim()}
              className="px-4 py-2 rounded-[10px] text-sm bg-[#0a2412] text-[#dee2df] font-medium hover:bg-[#0a2412]/90 disabled:opacity-40 flex items-center gap-1.5 transition-colors"
            >
              {creating && <Loader2 className="w-3 h-3 animate-spin" />}
              Create
            </button>
          </div>
        </div>
      )}

      {/* Rooms list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-[20px] p-4 animate-pulse">
              <div className="h-4 bg-[#e8e8e8] rounded w-40 mb-2" />
              <div className="h-3 bg-[#e8e8e8] rounded w-64" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {rooms.map((room) => (
            <div key={room.id} className="bg-white rounded-[20px] p-4 flex items-center gap-4 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Link href={`/community/rooms/${room.slug}`} className="text-sm font-bold text-[#0a2412] hover:underline">
                    {room.name}
                  </Link>
                  {room.is_private && <Lock className="w-3 h-3 text-[#4b4b4b]" />}
                </div>
                {room.description && (
                  <p className="text-xs text-[#4b4b4b] line-clamp-1">{room.description}</p>
                )}
                <div className="flex items-center gap-3 mt-1 text-xs text-[#808080]">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{room.member_count.toLocaleString()} members</span>
                  <span>{room.post_count} posts</span>
                </div>
              </div>
              <button
                onClick={() => handleJoin(room)}
                disabled={joiningId === room.id}
                className={`shrink-0 px-4 py-1.5 rounded-[10px] text-sm font-medium transition-colors ${
                  room.is_joined
                    ? "bg-[#f8fafb] text-[#292929] hover:bg-[#e8e8e8]"
                    : "bg-[#0a2412] text-[#dee2df] hover:bg-[#0a2412]/90"
                }`}
              >
                {joiningId === room.id ? <Loader2 className="w-3 h-3 animate-spin" /> : room.is_joined ? "Leave" : "Join"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
