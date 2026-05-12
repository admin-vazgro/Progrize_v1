"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";

export default function DeleteJobButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirming) { setConfirming(true); return; }
    setDeleting(true);
    await fetch(`/api/recruiter/jobs/${jobId}`, { method: "DELETE" });
    router.refresh();
  }

  function handleCancel(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setConfirming(false);
  }

  if (confirming) {
    return (
      <div
        className="flex items-center gap-1.5"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
      >
        <span className="text-[11px] text-[#5f5d54]">Close this job?</span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="h-[26px] px-2.5 rounded-[6px] bg-red-600 text-white text-[11px] font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-1"
        >
          {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Close"}
        </button>
        <button
          onClick={handleCancel}
          className="h-[26px] px-2.5 rounded-[6px] border border-[#eceae3] text-[#5f5d54] text-[11px] hover:border-[#c0bdb4] transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleDelete}
      title="Close job"
      className="opacity-0 group-hover:opacity-100 w-[28px] h-[28px] rounded-[8px] border border-[#eceae3] flex items-center justify-center text-[#c8c5bc] hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition-all"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}
