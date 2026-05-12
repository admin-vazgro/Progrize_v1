"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, CheckCircle, XCircle, Loader2, X } from "lucide-react";
import { bytesToSize } from "@/lib/utils";

type ParseStatus = "idle" | "uploading" | "parsing" | "done" | "error";

export default function UploadPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ParseStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  function handleFileSelect(selected: File) {
    if (!selected.name.match(/\.(pdf|docx|doc)$/i)) {
      setErrorMsg("Only PDF, DOC, and DOCX files are supported.");
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      setErrorMsg("File must be under 10 MB.");
      return;
    }
    setFile(selected);
    setErrorMsg(null);
    setStatus("idle");
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFileSelect(f);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFileSelect(f);
  }

  async function handleUpload() {
    if (!file) return;
    setStatus("uploading");
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/cv/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Upload failed");
      }

      setStatus("parsing");

      const { taskId } = await res.json();

      let attempts = 0;
      const maxAttempts = 30;
      while (attempts < maxAttempts) {
        await new Promise((r) => setTimeout(r, 2000));
        const poll = await fetch(`/api/cv/status?taskId=${taskId}`);
        const { status: taskStatus, error } = await poll.json();

        if (taskStatus === "completed") {
          setStatus("done");
          setTimeout(() => router.push("/profile"), 1500);
          return;
        }
        if (taskStatus === "failed") {
          throw new Error(error ?? "Parsing failed");
        }
        attempts++;
      }

      throw new Error("Parsing timed out. Try again.");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf8]">
      <div className="px-8 pt-8 pb-16 max-w-[640px]">

        <div className="mb-10">
          <h1 className="text-[52px] font-normal tracking-[-0.04em] text-[#0a2412] leading-none mb-2">
            Upload CV
          </h1>
          <p className="text-[14px] text-[#5f5d54] leading-relaxed">
            PDF or DOCX. AI parses it into your profile in under 30 seconds.
          </p>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => !file && fileRef.current?.click()}
          className={`rounded-[20px] transition-all border-2 border-dashed p-14 text-center ${
            dragging
              ? "border-[#c6f46b] bg-[#f7fcda]"
              : file
              ? "border-[#eceae3] bg-white cursor-default"
              : "border-[#dddbd2] bg-white hover:border-[#c6f46b] hover:bg-[#fafaf8] cursor-pointer"
          }`}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx"
            className="hidden"
            onChange={onInputChange}
          />

          {!file ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-14 h-14 rounded-[16px] bg-[#f0ede8] flex items-center justify-center">
                <Upload className="w-6 h-6 text-[#5f5d54]" />
              </div>
              <div>
                <p className="text-[15px] font-medium text-[#0a2412] mb-1">
                  Drop your CV here, or <span className="underline underline-offset-4">browse</span>
                </p>
                <p className="text-[12px] text-[#8a877b]">PDF, DOC, DOCX · max 10 MB</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 text-left">
              <div className="w-12 h-12 rounded-[12px] bg-[#e8f2eb] flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-[#0a2412]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-[#0a2412] truncate">{file.name}</p>
                <p className="text-[12px] text-[#8a877b]">{bytesToSize(file.size)}</p>
              </div>
              {status === "idle" && (
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); setStatus("idle"); }}
                  className="w-7 h-7 rounded-full bg-[#f0ede8] flex items-center justify-center hover:bg-[#e8e4de] transition-colors shrink-0"
                >
                  <X className="w-3.5 h-3.5 text-[#5f5d54]" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Status */}
        {status !== "idle" && (
          <div className="mt-5 flex items-center gap-2.5 text-[13px]">
            {status === "uploading" && (
              <><Loader2 className="w-4 h-4 animate-spin text-[#8a877b]" /><span className="text-[#5f5d54]">Uploading...</span></>
            )}
            {status === "parsing" && (
              <><Loader2 className="w-4 h-4 animate-spin text-[#8a877b]" /><span className="text-[#5f5d54]">Parsing your CV with AI...</span></>
            )}
            {status === "done" && (
              <><CheckCircle className="w-4 h-4 text-[#0a7854]" /><span className="text-[#0a7854] font-medium">Done. Redirecting to your profile...</span></>
            )}
            {status === "error" && (
              <><XCircle className="w-4 h-4 text-[#b91c1c]" /><span className="text-[#b91c1c]">{errorMsg}</span></>
            )}
          </div>
        )}

        {errorMsg && status === "idle" && (
          <p className="mt-4 text-[12px] text-[#b91c1c] bg-[#fee2e2] px-3 py-2.5 rounded-[10px]">{errorMsg}</p>
        )}

        {file && status === "idle" && (
          <div className="mt-6">
            <button
              onClick={handleUpload}
              className="h-[44px] px-6 bg-[#0a2412] text-[#fafaf8] text-[13px] font-medium rounded-[12px] hover:bg-[#0a2412]/90 transition-colors flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Parse my CV
            </button>
          </div>
        )}

        {/* Tips */}
        <div className="mt-12 pt-8 border-t border-[#eceae3]">
          <p className="text-[10px] font-semibold tracking-[0.8px] uppercase text-[#8a877b] mb-5">Tips for best results</p>
          <div className="flex flex-col gap-3">
            {[
              "Use clearly formatted sections: Experience, Education, Skills",
              "Include dates for all positions and education",
              "List specific skills rather than vague terms",
              "Keep bullet points concise with measurable achievements",
            ].map((tip) => (
              <p key={tip} className="text-[13px] text-[#5f5d54] leading-snug">{tip}</p>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
