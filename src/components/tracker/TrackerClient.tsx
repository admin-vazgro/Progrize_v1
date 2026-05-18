"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, MoreHorizontal, Zap, Loader2, X, ExternalLink, FileText, Calendar, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "@/lib/utils";
import { companyColor } from "@/lib/job-colors";

export interface JobApplication {
  id: string;
  job_title: string;
  company_name: string;
  source_url: string | null;
  location: string | null;
  salary_range: string | null;
  notes: string | null;
  status: string;
  ats_score?: number | null;
  applied_at: string | null;
  created_at: string;
}

type ColumnId = "saved" | "applied" | "interviewing" | "offer" | "rejected";

const COLUMNS: { id: ColumnId; label: string }[] = [
  { id: "saved",        label: "saved" },
  { id: "applied",      label: "applied" },
  { id: "interviewing", label: "interview" },
  { id: "offer",        label: "offer" },
  { id: "rejected",     label: "closed" },
];

const AVATAR_COLORS = [
  "#e8704a", "#7c6af7", "#f59e0b", "#374151",
  "#0a2412", "#dc2626", "#0891b2", "#7c3aed",
  "#059669", "#d97706", "#be185d", "#84cc16",
];

function avatarColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

function scoreBg(score: number): string {
  if (score >= 70) return "rgba(198,244,107,0.25)";
  if (score >= 50) return "rgba(251,191,36,0.2)";
  return "rgba(248,113,113,0.2)";
}

function scoreText(score: number): string {
  if (score >= 70) return "#3a6b10";
  if (score >= 50) return "#92400e";
  return "#b91c1c";
}

function isProgrizeJob(notes: string | null) {
  return notes?.includes("Applied via Progrize") ?? false;
}

function extractCvName(notes: string | null): string | null {
  const match = notes?.match(/· cv: (.+?)$/);
  return match?.[1]?.trim() ?? null;
}

export default function TrackerClient() {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    job_title: "", company_name: "", source_url: "", location: "", salary_range: "", notes: "",
  });
  const [addStatus, setAddStatus] = useState<ColumnId>("saved");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<ColumnId | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<JobApplication | null>(null);
  const dragCounters = useRef<Record<string, number>>({});

  useEffect(() => {
    fetch("/api/tracker")
      .then((r) => r.json())
      .then((d) => setApplications(d.applications ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectedApp(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function handleAdd() {
    if (!addForm.job_title.trim() || !addForm.company_name.trim()) return;
    setAdding(true);
    setAddError(null);
    const res = await fetch("/api/tracker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...addForm, status: addStatus }),
    });
    const data = await res.json();
    if (res.ok) {
      setApplications((prev) => [data.application, ...prev]);
      setAddForm({ job_title: "", company_name: "", source_url: "", location: "", salary_range: "", notes: "" });
      setShowAdd(false);
    } else {
      setAddError(data.error ?? "Failed to add");
    }
    setAdding(false);
  }

  async function moveCard(app: JobApplication, newStatus: ColumnId) {
    if (app.status === newStatus) return;
    setMovingId(app.id);
    setApplications((prev) => prev.map((a) => a.id === app.id ? { ...a, status: newStatus } : a));
    if (selectedApp?.id === app.id) setSelectedApp((s) => s ? { ...s, status: newStatus } : s);
    const res = await fetch(`/api/tracker/${app.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) setApplications((prev) => prev.map((a) => a.id === app.id ? { ...a, status: app.status } : a));
    setMovingId(null);
  }

  async function deleteCard(id: string) {
    const snapshot = applications.slice();
    setApplications((prev) => prev.filter((a) => a.id !== id));
    if (selectedApp?.id === id) setSelectedApp(null);
    const res = await fetch(`/api/tracker/${id}`, { method: "DELETE" });
    if (!res.ok) setApplications(snapshot);
  }

  function byColumn(col: ColumnId) {
    return applications.filter((a) => a.status === col);
  }

  if (loading) {
    return (
      <div className="p-[32px]">
        <div className="h-[32px] bg-[#eceae3] rounded-[8px] w-[180px] mb-[8px] animate-pulse" />
        <div className="h-[14px] bg-[#eceae3] rounded w-[280px] mb-[32px] animate-pulse" />
        <div className="flex gap-[16px]">
          {COLUMNS.map((c) => (
            <div key={c.id} className="flex-1 space-y-[10px]">
              <div className="h-[14px] bg-[#eceae3] rounded w-[60px] animate-pulse mb-[12px]" />
              {[...Array(2)].map((_, i) => (
                <div key={i} className="bg-white rounded-[16px] p-[12px] animate-pulse h-[100px]" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-[32px] h-full flex flex-col overflow-hidden">

      {/* Header */}
      <div className="flex items-start justify-between shrink-0 mb-[32px]">
        <div>
          <h1 className="text-[52px] text-[#061810] tracking-[-0.095em] leading-none font-normal">
            your tracker
          </h1>
          <p className="text-[12px] text-[#8a877b] mt-[4px] font-normal">
            drag cards across columns as your applications progress
          </p>
        </div>
        <div className="flex items-center gap-[8px]">
          <button
            onClick={() => { setShowAdd(true); setAddError(null); }}
            className="h-[34px] px-[14px] border border-[#eceae3] text-[#3d3c36] text-[12px] font-medium rounded-[10px] hover:border-[#c0bdb4] transition-colors flex items-center gap-[6px]"
          >
            <Plus className="w-[12px] h-[12px]" />
            add manually
          </button>
          <button className="h-[34px] px-[14px] bg-[#0a2412] text-[#fafaf8] text-[12px] font-medium rounded-[10px] hover:bg-[#0a2412]/90 transition-colors flex items-center gap-[6px]">
            <Zap className="w-[12px] h-[12px] text-[#c6f46b]" />
            auto-track replies
          </button>
        </div>
      </div>

      {/* Board */}
      <div className="flex gap-[16px] flex-1 overflow-x-auto pb-[8px]">
        {COLUMNS.map((col) => {
          const cards = byColumn(col.id);
          const isOver = dragOver === col.id;
          return (
            <div
              key={col.id}
              className="flex-1 min-w-[170px] flex flex-col"
              onDragEnter={(e) => {
                e.preventDefault();
                dragCounters.current[col.id] = (dragCounters.current[col.id] ?? 0) + 1;
                setDragOver(col.id);
              }}
              onDragOver={(e) => { e.preventDefault(); }}
              onDragLeave={() => {
                dragCounters.current[col.id] = Math.max((dragCounters.current[col.id] ?? 1) - 1, 0);
                if (dragCounters.current[col.id] === 0) setDragOver(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                dragCounters.current[col.id] = 0;
                if (dragId) {
                  const app = applications.find((a) => a.id === dragId);
                  if (app) moveCard(app, col.id);
                }
                setDragId(null);
                setDragOver(null);
              }}
            >
              {/* Column header */}
              <div className="flex items-center justify-between mb-[12px]">
                <div className="flex items-center gap-[7px]">
                  <span className="text-[13px] font-medium text-[#3d3c36]">{col.label}</span>
                  <span className="text-[10px] text-[#8a877b] bg-[#eceae3] rounded-full w-[18px] h-[18px] flex items-center justify-center font-medium">
                    {cards.length}
                  </span>
                </div>
                <button className="text-[#c0bdb4] hover:text-[#8a877b] transition-colors">
                  <MoreHorizontal className="w-[14px] h-[14px]" />
                </button>
              </div>

              {/* Cards */}
              <div className={`flex flex-col gap-[8px] flex-1 rounded-[14px] transition-all min-h-[60px] ${isOver ? "bg-[#f0fad8]/60 ring-1 ring-[#c6f46b]/40" : ""}`}>
                {cards.map((app) => (
                  <TrackerCard
                    key={app.id}
                    app={app}
                    isMoving={movingId === app.id}
                    isDragging={dragId === app.id}
                    isSelected={selectedApp?.id === app.id}
                    onDragStart={() => setDragId(app.id)}
                    onDragEnd={() => { setDragId(null); setDragOver(null); dragCounters.current = {}; }}
                    onDelete={deleteCard}
                    onClick={() => setSelectedApp(app)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {applications.length === 0 && !loading && (
        <div className="text-center mt-[40px]">
          <p className="text-[14px] font-semibold text-[#0a2412] mb-[4px]">No applications yet</p>
          <p className="text-[12px] text-[#8a877b] mb-[16px]">Add jobs you&apos;ve saved or applied to.</p>
          <button
            onClick={() => setShowAdd(true)}
            className="h-[34px] px-[16px] bg-[#0a2412] text-[#fafaf8] text-[12px] font-medium rounded-[10px] hover:bg-[#0a2412]/90 transition-colors"
          >
            Add first application
          </button>
        </div>
      )}

      {/* Add manually modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-[2px]">
          <div className="bg-white rounded-[20px] w-full max-w-[420px] shadow-2xl">
            <div className="flex items-center justify-between px-[20px] pt-[20px] pb-[16px]">
              <p className="text-[14px] font-semibold text-[#0a2412]">Add application</p>
              <button onClick={() => { setShowAdd(false); setAddError(null); }} className="text-[#b0ae9f] hover:text-[#5f5d54] transition-colors">
                <X className="w-[16px] h-[16px]" />
              </button>
            </div>

            <div className="px-[20px] pb-[20px] flex flex-col gap-[12px]">
              <div className="grid grid-cols-2 gap-[10px]">
                {[
                  { label: "Job title *", key: "job_title", placeholder: "Senior Designer" },
                  { label: "Company *",   key: "company_name", placeholder: "Acme Corp" },
                ].map(({ label, key, placeholder }) => (
                  <div key={key}>
                    <label className="text-[11px] font-medium text-[#5f5d54] mb-[5px] block">{label}</label>
                    <input
                      value={addForm[key as keyof typeof addForm]}
                      onChange={(e) => setAddForm((f) => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full h-[36px] px-[10px] rounded-[10px] bg-[#f5f4f0] text-[#1a1a16] text-[12px] placeholder:text-[#b0ae9f] outline-none focus:ring-2 focus:ring-[#c6f46b]/40"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="text-[11px] font-medium text-[#5f5d54] mb-[6px] block">Stage</label>
                <div className="flex flex-wrap gap-[6px]">
                  {COLUMNS.map((col) => (
                    <button
                      key={col.id}
                      onClick={() => setAddStatus(col.id)}
                      className={`h-[28px] px-[12px] rounded-full text-[11px] font-medium transition-colors ${
                        addStatus === col.id
                          ? "bg-[#0a2412] text-[#fafaf8]"
                          : "bg-[#f5f4f0] text-[#5f5d54] hover:bg-[#eceae3]"
                      }`}
                    >
                      {col.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-[10px]">
                {[
                  { label: "Location",     key: "location",     placeholder: "London" },
                  { label: "Salary range", key: "salary_range", placeholder: "£60–80k" },
                ].map(({ label, key, placeholder }) => (
                  <div key={key}>
                    <label className="text-[11px] font-medium text-[#5f5d54] mb-[5px] block">{label}</label>
                    <input
                      value={addForm[key as keyof typeof addForm]}
                      onChange={(e) => setAddForm((f) => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full h-[36px] px-[10px] rounded-[10px] bg-[#f5f4f0] text-[#1a1a16] text-[12px] placeholder:text-[#b0ae9f] outline-none focus:ring-2 focus:ring-[#c6f46b]/40"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="text-[11px] font-medium text-[#5f5d54] mb-[5px] block">Job URL</label>
                <input
                  value={addForm.source_url}
                  onChange={(e) => setAddForm((f) => ({ ...f, source_url: e.target.value }))}
                  placeholder="https://…"
                  className="w-full h-[36px] px-[10px] rounded-[10px] bg-[#f5f4f0] text-[#1a1a16] text-[12px] placeholder:text-[#b0ae9f] outline-none focus:ring-2 focus:ring-[#c6f46b]/40"
                />
              </div>

              {addError && <p className="text-[11px] text-red-500">{addError}</p>}

              <div className="flex justify-end gap-[8px] pt-[4px]">
                <button
                  onClick={() => { setShowAdd(false); setAddError(null); }}
                  className="h-[34px] px-[14px] border border-[#eceae3] text-[#5f5d54] text-[12px] font-medium rounded-[10px] hover:border-[#c0bdb4] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={adding || !addForm.job_title.trim() || !addForm.company_name.trim()}
                  className="h-[34px] px-[16px] bg-[#0a2412] text-[#fafaf8] text-[12px] font-medium rounded-[10px] hover:bg-[#0a2412]/90 disabled:opacity-40 flex items-center gap-[6px] transition-colors"
                >
                  {adding && <Loader2 className="w-[12px] h-[12px] animate-spin" />}
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Application detail panel */}
      {selectedApp && (
        <ApplicationDetailPanel
          app={selectedApp}
          onClose={() => setSelectedApp(null)}
          onMove={(newStatus) => moveCard(selectedApp, newStatus as ColumnId)}
          onDelete={(id) => deleteCard(id)}
        />
      )}
    </div>
  );
}

function TrackerCard({
  app, isMoving, isDragging, isSelected, onDragStart, onDragEnd, onDelete, onClick,
}: {
  app: JobApplication;
  isMoving: boolean;
  isDragging: boolean;
  isSelected: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDelete: (id: string) => void;
  onClick: () => void;
}) {
  const color = avatarColor(app.company_name);
  const initials = app.company_name.slice(0, 2).toUpperCase();
  const score = app.ats_score ?? null;
  const progrize = isProgrizeJob(app.notes);
  const wasDragged = useRef(false);

  return (
    <div
      draggable
      onDragStart={(e) => { e.stopPropagation(); wasDragged.current = true; onDragStart(); }}
      onDragEnd={() => { onDragEnd(); setTimeout(() => { wasDragged.current = false; }, 0); }}
      onClick={() => { if (!wasDragged.current) onClick(); }}
      className={`relative bg-white rounded-[16px] p-[12px] cursor-pointer select-none group transition-all duration-150 animate-fade-up ${
        isSelected ? "ring-2 ring-[#0a2412]/20 shadow-md" :
        isMoving || isDragging ? "opacity-40 scale-[0.97] cursor-grab" : "hover:shadow-md hover:-translate-y-[2px]"
      }`}
    >
      {/* Company avatar */}
      <div className="flex items-start justify-between mb-[10px]">
        <div className="relative shrink-0">
          <div
            className="w-[40px] h-[40px] rounded-[10px] flex items-center justify-center text-white text-[13px] font-bold"
            style={{ backgroundColor: companyColor(app.company_name) }}
          >
            {initials}
          </div>
          {progrize && (
            <div className="absolute -bottom-[3px] -right-[3px] w-[14px] h-[14px] rounded-[4px] bg-[#0a2412] flex items-center justify-center border-[1.5px] border-white">
              <div className="flex items-end gap-[1px]">
                <div className="w-[1.5px] h-[3px] bg-[#dee2df] rounded-tl-[1px]" />
                <div className="w-[1.5px] h-[4.5px] bg-[#dee2df] rounded-tl-[1px]" />
                <div className="w-[1.5px] h-[6px] bg-[#dee2df] rounded-tl-[1px]" />
              </div>
            </div>
          )}
        </div>
        <ArrowRight className="w-[12px] h-[12px] text-[#d4d0c8] opacity-0 group-hover:opacity-100 transition-opacity mt-[2px]" />
      </div>

      {/* Title + company */}
      <p className="text-[13px] font-semibold text-[#0a2412] leading-[17px] truncate">{app.job_title}</p>
      <p className="text-[11px] text-[#8a877b] mt-[2px] truncate">{app.company_name}</p>

      {/* Bottom row */}
      <div className="flex items-center justify-between mt-[10px]">
        {score != null ? (
          <span
            className="text-[10px] font-semibold px-[7px] py-[2px] rounded-full"
            style={{ backgroundColor: scoreBg(score), color: scoreText(score) }}
          >
            {score}%
          </span>
        ) : (
          <span />
        )}
        <p className="text-[10px] text-[#b0ae9f]">{formatDistanceToNow(app.created_at)}</p>
      </div>

      {/* Delete on hover */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(app.id); }}
        className="absolute top-[10px] right-[10px] opacity-0 group-hover:opacity-100 text-[#c0bdb4] hover:text-red-400 transition-all"
      >
        <X className="w-[12px] h-[12px]" />
      </button>
    </div>
  );
}

function ApplicationDetailPanel({
  app, onClose, onMove, onDelete,
}: {
  app: JobApplication;
  onClose: () => void;
  onMove: (status: string) => void;
  onDelete: (id: string) => void;
}) {
  const color = avatarColor(app.company_name);
  const initials = app.company_name.slice(0, 2).toUpperCase();
  const progrize = isProgrizeJob(app.notes);
  const cvName = extractCvName(app.notes);
  const score = app.ats_score ?? null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-screen w-[360px] z-50 bg-white border-l border-[#eceae3] shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-start gap-[12px] p-[20px] border-b border-[#f0ede8]">
          <div className="relative shrink-0">
            <div
              className="w-[44px] h-[44px] rounded-[12px] flex items-center justify-center text-white text-[14px] font-bold"
              style={{ backgroundColor: companyColor(app.company_name) }}
            >
              {initials}
            </div>
            {progrize && (
              <div className="absolute -bottom-[4px] -right-[4px] w-[16px] h-[16px] rounded-[5px] bg-[#0a2412] flex items-center justify-center border-[1.5px] border-white">
                <div className="flex items-end gap-[1px]">
                  <div className="w-[2px] h-[3px] bg-[#dee2df] rounded-tl-[1px]" />
                  <div className="w-[2px] h-[5px] bg-[#dee2df] rounded-tl-[1px]" />
                  <div className="w-[2px] h-[7px] bg-[#dee2df] rounded-tl-[1px]" />
                </div>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            {progrize && (
              <span className="text-[9px] font-semibold tracking-[0.08em] uppercase text-[#1a5c30] bg-[#e8f2eb] px-[6px] py-[2px] rounded-full inline-block mb-[4px]">
                Progrize
              </span>
            )}
            <p className="text-[15px] font-semibold text-[#0a2412] leading-[19px] tracking-[-0.02em]">{app.job_title}</p>
            <p className="text-[12px] text-[#8a877b] mt-[2px]">{app.company_name}</p>
          </div>
          <button
            onClick={onClose}
            className="w-[28px] h-[28px] rounded-[8px] border border-[#eceae3] flex items-center justify-center text-[#b0ae9f] hover:text-[#5f5d54] transition-colors shrink-0"
          >
            <X className="w-[14px] h-[14px]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-[20px] flex flex-col gap-[16px]">

          {/* ATS score */}
          {score != null && (
            <div
              className="flex items-center gap-[10px] px-[14px] py-[10px] rounded-[12px]"
              style={{ backgroundColor: scoreBg(score) }}
            >
              <span className="text-[22px] font-bold" style={{ color: scoreText(score) }}>{score}%</span>
              <div>
                <p className="text-[11px] font-semibold" style={{ color: scoreText(score) }}>ATS Match Score</p>
                <p className="text-[10px] text-[#8a877b]">
                  {score >= 70 ? "Strong match" : score >= 50 ? "Partial match" : "Low match"}
                </p>
              </div>
            </div>
          )}

          {/* Saved / Applied date */}
          {(app.applied_at || app.created_at) && (
            <div className="flex items-center gap-[8px] text-[12px] text-[#8a877b]">
              <Calendar className="w-[13px] h-[13px] shrink-0" />
              <span>
                {app.status === "saved"
                  ? `Saved ${formatDistanceToNow(app.created_at)}`
                  : `Applied ${formatDistanceToNow(app.applied_at ?? app.created_at)}`}
              </span>
            </div>
          )}

          {/* Applied CV */}
          {cvName && (
            <div className="bg-[#f5f4f0] rounded-[12px] px-[14px] py-[10px]">
              <p className="text-[10px] font-mono text-[#8a877b] mb-[5px]">applied with</p>
              <div className="flex items-center gap-[8px]">
                <FileText className="w-[14px] h-[14px] text-[#0a2412] shrink-0" />
                <p className="text-[12px] font-medium text-[#0a2412] truncate">{cvName}</p>
              </div>
            </div>
          )}

          {/* View job link */}
          {(app.source_url || progrize) && (
            <a
              href={progrize ? "/jobs" : app.source_url!}
              target={progrize ? "_self" : "_blank"}
              rel="noreferrer"
              className="flex items-center justify-between px-[14px] py-[10px] rounded-[12px] border border-[#eceae3] hover:border-[#c0bdb4] hover:bg-[#fafaf8] transition-colors group"
            >
              <div className="flex items-center gap-[8px]">
                <ExternalLink className="w-[13px] h-[13px] text-[#8a877b] shrink-0" />
                <p className="text-[12px] font-medium text-[#3d3c36]">
                  {progrize ? "Browse Progrize jobs" : "View original posting"}
                </p>
              </div>
              <ArrowRight className="w-[12px] h-[12px] text-[#c0bdb4] group-hover:text-[#8a877b] transition-colors" />
            </a>
          )}

          {/* Location / salary */}
          {(app.location || app.salary_range) && (
            <div className="flex flex-wrap gap-[6px]">
              {app.location && (
                <span className="px-[10px] py-[4px] rounded-full bg-[#f5f4f0] text-[#5f5d54] text-[11px]">{app.location}</span>
              )}
              {app.salary_range && (
                <span className="px-[10px] py-[4px] rounded-full bg-[#f5f4f0] text-[#5f5d54] text-[11px]">{app.salary_range}</span>
              )}
            </div>
          )}

          {/* Move stage */}
          <div>
            <p className="text-[10px] font-mono text-[#8a877b] mb-[8px]">move to stage</p>
            <div className="flex flex-wrap gap-[6px]">
              {COLUMNS.map((col) => (
                <button
                  key={col.id}
                  onClick={() => onMove(col.id)}
                  className={`h-[28px] px-[12px] rounded-full text-[11px] font-medium transition-colors ${
                    app.status === col.id
                      ? "bg-[#0a2412] text-[#fafaf8]"
                      : "bg-[#f5f4f0] text-[#5f5d54] hover:bg-[#eceae3]"
                  }`}
                >
                  {col.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-[#f0ede8]" />

          {/* Delete */}
          <button
            onClick={() => { onDelete(app.id); onClose(); }}
            className="flex items-center gap-[6px] text-[11px] text-[#c0bdb4] hover:text-red-400 transition-colors"
          >
            <X className="w-[11px] h-[11px]" />
            Remove from tracker
          </button>
        </div>
      </div>
    </>
  );
}
