"use client";

import { useState, useRef } from "react";
import { X, Upload, FileText, Loader2, CheckCircle, XCircle } from "lucide-react";
import { bytesToSize } from "@/lib/utils";
import type { Database } from "@/types/database";

type ResumeFile = Database["public"]["Tables"]["resume_files"]["Row"];
type ParseStatus = "idle" | "uploading" | "parsing" | "done" | "error";

interface Props {
  onClose: () => void;
  onUploaded: () => void;
}

export default function CVUploadModal({ onClose, onUploaded }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ParseStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  function handleFileSelect(f: File) {
    if (!f.name.match(/\.(pdf|docx|doc)$/i)) {
      setErrorMsg("Only PDF, DOC, and DOCX files are supported.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setErrorMsg("File must be under 10 MB.");
      return;
    }
    setFile(f);
    setErrorMsg(null);
    setStatus("idle");
  }

  async function handleUpload() {
    if (!file) return;
    setStatus("uploading");
    setErrorMsg(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/cv/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Upload failed");
      }
      const { taskId } = await res.json();
      setStatus("parsing");

      let attempts = 0;
      while (attempts < 30) {
        await new Promise((r) => setTimeout(r, 2000));
        const poll = await fetch(`/api/cv/status?taskId=${taskId}`);
        const { status: taskStatus, error } = await poll.json();
        if (taskStatus === "completed") {
          setStatus("done");
          setTimeout(() => { onUploaded(); onClose(); }, 1200);
          return;
        }
        if (taskStatus === "failed") throw new Error(error ?? "Parsing failed");
        attempts++;
      }
      throw new Error("Parsing timed out. Try again.");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-[20px] w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-5 pb-4">
          <h2 className="text-sm font-bold text-[#0a2412]">Upload CV</h2>
          <button onClick={onClose} className="text-[#4b4b4b] hover:text-[#292929]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) handleFileSelect(f); }}
            onClick={() => !file && fileRef.current?.click()}
            className={`rounded-[14px] transition-colors cursor-pointer p-8 text-center ${dragging ? "bg-[#f7fcca]" : "bg-[#f8fafb]"} ${file ? "cursor-default" : ""}`}
          >
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
            {!file ? (
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-5 h-5 text-[#808080]" />
                <p className="text-sm font-medium text-[#292929]">Drop your CV here, or <span className="underline underline-offset-2">browse</span></p>
                <p className="text-xs text-[#808080]">PDF, DOC, DOCX · max 10 MB</p>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-[#4b4b4b] shrink-0" />
                <div className="text-left flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#292929] truncate">{file.name}</p>
                  <p className="text-xs text-[#808080]">{bytesToSize(file.size)}</p>
                </div>
                {status === "idle" && (
                  <button onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-xs text-[#808080] hover:text-[#292929]">Remove</button>
                )}
              </div>
            )}
          </div>

          {/* Status */}
          {status !== "idle" && (
            <div className="flex items-center gap-2 text-sm text-[#292929]">
              {(status === "uploading" || status === "parsing") && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
              {status === "done" && <CheckCircle className="w-4 h-4 text-[#0a2412] shrink-0" />}
              {status === "error" && <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
              <span className={status === "error" ? "text-red-600" : ""}>
                {status === "uploading" && "Uploading…"}
                {status === "parsing" && "Parsing your CV with AI…"}
                {status === "done" && "Done! Refreshing…"}
                {status === "error" && errorMsg}
              </span>
            </div>
          )}

          {errorMsg && status === "idle" && (
            <p className="text-sm text-red-600">{errorMsg}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 p-5 pt-0">
          <button onClick={onClose} className="px-4 py-2 rounded-[10px] text-sm text-[#292929] hover:bg-[#f0f0f0] transition-colors">
            Cancel
          </button>
          {file && status === "idle" && (
            <button
              onClick={handleUpload}
              className="px-4 py-2 rounded-[10px] text-sm bg-[#0a2412] text-[#dee2df] font-medium hover:bg-[#0a2412]/90 flex items-center gap-1.5 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" /> Upload & parse
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
