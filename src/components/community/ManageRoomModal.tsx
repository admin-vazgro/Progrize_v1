"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2, Trash2, Globe, Lock } from "lucide-react";

interface Room {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_private: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  room: Room;
  onUpdated: (room: Room) => void;
}

export default function ManageRoomModal({ isOpen, onClose, room, onUpdated }: Props) {
  const router = useRouter();
  const [name, setName] = useState(room.name);
  const [description, setDescription] = useState(room.description ?? "");
  const [isPrivate, setIsPrivate] = useState(room.is_private);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/rooms/${room.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), description: description.trim() || null, is_private: isPrivate }),
    });
    const data = await res.json();
    if (res.ok) {
      onUpdated(data.room);
      onClose();
    } else {
      setError(data.error ?? "Failed to save changes");
    }
    setSaving(false);
  }

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/rooms/${room.slug}`, { method: "DELETE" });
    if (res.ok) {
      onClose();
      router.push("/community");
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to delete room");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-white rounded-[24px] w-full max-w-[440px] mx-4 shadow-2xl">

        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#eceae3]">
          <div>
            <h2 className="text-[15px] font-bold text-[#0a2412]">Manage Room</h2>
            <p className="text-[11px] text-[#8a877b] mt-0.5">r/{room.slug}</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f0ede8] text-[#8a877b] hover:text-[#0a2412] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-[10px] font-semibold text-[#5f5d54] uppercase tracking-wider mb-1.5">Room Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              className="w-full border border-[#eceae3] rounded-[10px] px-3 h-[40px] text-[13px] text-[#292929] outline-none focus:border-[#0a2412] transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-[#5f5d54] uppercase tracking-wider mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this room about?"
              rows={3}
              maxLength={300}
              className="w-full border border-[#eceae3] rounded-[10px] px-3 py-2.5 text-[13px] text-[#292929] placeholder:text-[#b0ae9f] outline-none resize-none focus:border-[#0a2412] transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-[#5f5d54] uppercase tracking-wider mb-2">Visibility</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setIsPrivate(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] border text-left transition-colors ${
                  !isPrivate ? "border-[#0a2412] bg-[#f0fdf4]" : "border-[#eceae3] hover:border-[#c0bdb4]"
                }`}
              >
                <Globe className={`w-3.5 h-3.5 shrink-0 ${!isPrivate ? "text-[#0a2412]" : "text-[#8a877b]"}`} />
                <div>
                  <p className={`text-[12px] font-medium ${!isPrivate ? "text-[#0a2412]" : "text-[#3d3c36]"}`}>Public</p>
                  <p className="text-[10px] text-[#8a877b]">Anyone can join</p>
                </div>
              </button>
              <button
                onClick={() => setIsPrivate(true)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] border text-left transition-colors ${
                  isPrivate ? "border-[#0a2412] bg-[#f0fdf4]" : "border-[#eceae3] hover:border-[#c0bdb4]"
                }`}
              >
                <Lock className={`w-3.5 h-3.5 shrink-0 ${isPrivate ? "text-[#0a2412]" : "text-[#8a877b]"}`} />
                <div>
                  <p className={`text-[12px] font-medium ${isPrivate ? "text-[#0a2412]" : "text-[#3d3c36]"}`}>Private</p>
                  <p className="text-[10px] text-[#8a877b]">Invite only</p>
                </div>
              </button>
            </div>
          </div>

          {error && <p className="text-[12px] text-red-600 bg-red-50 px-3 py-2 rounded-[8px]">{error}</p>}
        </div>

        <div className="px-6 pb-5 flex items-center justify-between">
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 text-[12px] text-red-500 hover:text-red-700 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete room
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-red-600 font-medium">Are you sure?</span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-[12px] font-semibold text-white bg-red-600 hover:bg-red-700 px-3 py-1 rounded-[6px] transition-colors flex items-center gap-1"
              >
                {deleting && <Loader2 className="w-3 h-3 animate-spin" />}
                Delete
              </button>
              <button onClick={() => setConfirmDelete(false)} className="text-[12px] text-[#5f5d54] hover:text-[#0a2412]">
                Cancel
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={onClose} className="h-[36px] px-4 rounded-[10px] text-[13px] text-[#5f5d54] hover:bg-[#f0ede8] transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="h-[36px] px-5 rounded-[10px] text-[13px] font-medium bg-[#0a2412] text-[#dee2df] hover:bg-[#0a2412]/90 disabled:opacity-50 flex items-center gap-2 transition-colors"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
