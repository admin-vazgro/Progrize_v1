"use client";

import { useState } from "react";
import { MapPin, Briefcase, Plus, Bell, ExternalLink, AlertTriangle, Link2, FileText, Trash2, Zap, Upload } from "lucide-react";
import type { Database } from "@/types/database";
import EditProfileModal from "./EditProfileModal";
import ExperienceModal from "./ExperienceModal";
import EducationModal from "./EducationModal";
import ProjectModal from "./ProjectModal";
import CertificationModal from "./CertificationModal";
import SkillsModal from "./SkillsModal";
import NetworkingModal from "./NetworkingModal";
import CVUploadModal from "./CVUploadModal";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type ExperienceItem = Database["public"]["Tables"]["experience_items"]["Row"];
type EducationItem = Database["public"]["Tables"]["education_items"]["Row"];
type CertificationItem = Database["public"]["Tables"]["certifications"]["Row"];
type ProjectItem = Database["public"]["Tables"]["profile_projects"]["Row"];
type ResumeFile = Pick<Database["public"]["Tables"]["resume_files"]["Row"], "id" | "file_name" | "file_size_bytes" | "parse_status" | "uploaded_at">;
type ProfileTab = "about" | "experience" | "education" | "projects" | "certifications";

interface Room { id: string; name: string; slug: string; member_count: number; }

interface Props {
  profile: Profile | null;
  experience: ExperienceItem[];
  education: EducationItem[];
  certifications: CertificationItem[];
  projects: ProjectItem[];
  skills: string[];
  rooms: Room[];
  resumeFiles: ResumeFile[];
  hasCV: boolean;
  isProfileComplete: boolean;
  userId: string;
}

function getInitials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function fmtDate(dateStr: string | null) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export default function ProfilePage({
  profile: initialProfile, experience: initialExp, education: initialEdu,
  certifications: initialCertifications, projects: initialProjects, skills: initialSkills, rooms: initialRooms, resumeFiles: initialCVs, userId,
}: Props) {
  const [activeTab, setActiveTab] = useState<ProfileTab>("about");
  const [profileData, setProfileData] = useState<Profile | null>(initialProfile);
  const [expList, setExpList] = useState<ExperienceItem[]>(initialExp);
  const [eduList, setEduList] = useState<EducationItem[]>(initialEdu);
  const [certList, setCertList] = useState<CertificationItem[]>(initialCertifications);
  const [projectList, setProjectList] = useState<ProjectItem[]>(initialProjects);
  const [skillList, setSkillList] = useState<string[]>(initialSkills);
  const [cvList, setCvList] = useState<ResumeFile[]>(initialCVs);

  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showAddExp, setShowAddExp] = useState(false);
  const [editingExp, setEditingExp] = useState<ExperienceItem | null>(null);
  const [showAddEdu, setShowAddEdu] = useState(false);
  const [editingEdu, setEditingEdu] = useState<EducationItem | null>(null);
  const [showAddProject, setShowAddProject] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectItem | null>(null);
  const [showAddCert, setShowAddCert] = useState(false);
  const [editingCert, setEditingCert] = useState<CertificationItem | null>(null);
  const [showSkills, setShowSkills] = useState(false);
  const [showNetworking, setShowNetworking] = useState(false);
  const [showCVUpload, setShowCVUpload] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleShare() {
    const url = `${window.location.origin}/u/${userId}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => window.prompt("Copy this link:", url));
    } else {
      window.prompt("Copy this link:", url);
    }
  }

  async function refreshCVs() {
    const res = await fetch("/api/cv/list");
    if (res.ok) {
      const data = await res.json();
      setCvList(data.files ?? []);
    }
  }

  async function deleteCV(id: string) {
    const snapshot = cvList.slice();
    setCvList((prev) => prev.filter((f) => f.id !== id));
    const res = await fetch(`/api/cv/${id}`, { method: "DELETE" });
    if (!res.ok) setCvList(snapshot);
  }

  const name = profileData?.full_name ?? "Your Name";
  const headline = profileData?.headline ?? "";
  const location = profileData?.location ?? "";
  const portfolio = profileData?.portfolio_url ?? "";
  const summary = profileData?.summary ?? "";
  const avatarUrl = profileData?.avatar_url ?? null;
  const coverUrl = profileData?.cover_url ?? null;
  const currentRole = expList.find((e) => e.is_current) ?? expList[0];
  const isProfileComplete = !!(profileData?.full_name && profileData?.headline && expList.length > 0);
  const tabs: { key: ProfileTab; label: string }[] = [
    { key: "about", label: "About" },
    { key: "experience", label: "Experience" },
    { key: "education", label: "Education" },
    { key: "projects", label: "Projects" },
    { key: "certifications", label: "Certifications" },
  ];

  function handleExpSave(item: ExperienceItem) {
    setExpList((prev) => {
      const idx = prev.findIndex((e) => e.id === item.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = item; return next; }
      return [item, ...prev];
    });
  }

  function handleEduSave(item: EducationItem) {
    setEduList((prev) => {
      const idx = prev.findIndex((e) => e.id === item.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = item; return next; }
      return [item, ...prev];
    });
  }

  function handleProjectSave(item: ProjectItem) {
    setProjectList((prev) => {
      const idx = prev.findIndex((p) => p.id === item.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = item; return next; }
      return [item, ...prev];
    });
  }

  function handleCertSave(item: CertificationItem) {
    setCertList((prev) => {
      const idx = prev.findIndex((c) => c.id === item.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = item; return next; }
      return [item, ...prev];
    });
  }

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf8]">
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-4 md:py-8 flex gap-5 items-start">

        {/* ── Main column ── */}
        <div className="flex-1 min-w-0">

          {/* Hero card */}
          <div className="bg-white rounded-[20px] overflow-hidden mb-5">
            <div
              className="h-[200px]"
              style={coverUrl
                ? { backgroundImage: `url(${coverUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
                : { background: "linear-gradient(135deg, #1c5030 0%, #0a2412 100%)" }}
            />

            <div className="px-7 pb-8">
              <div className="flex items-start justify-between">
                <div
                  className="w-[108px] h-[108px] rounded-full border-4 border-[#c1cc5a] flex items-center justify-center text-white text-2xl font-bold -mt-[54px] shrink-0 overflow-hidden"
                  style={avatarUrl
                    ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: "cover", backgroundPosition: "center", backgroundColor: "#2d6a4f" }
                    : { backgroundColor: "#2d6a4f" }}
                >
                  {!avatarUrl && getInitials(profileData?.full_name ?? null)}
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <button
                    onClick={() => setShowEditProfile(true)}
                    className="text-sm font-medium text-[#4b4b4b] underline underline-offset-2 hover:text-[#0a2412] transition-colors"
                  >
                    Edit profile
                  </button>
                  <button
                    onClick={handleShare}
                    className="px-5 py-2 rounded-[10px] bg-[#0a2412] text-[#dee2df] text-sm font-medium hover:bg-[#0a2412]/90 transition active:scale-[0.97]"
                  >
                    {copied ? "Copied!" : "Share"}
                  </button>
                </div>
              </div>

              <div className="mt-5">
                <h1 className="text-[22px] font-bold text-[#0a2412] tracking-tight leading-none">{name}</h1>
                {headline && (
                  <p className="text-[16px] font-medium text-[#292929] mt-2">{headline}</p>
                )}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3">
                  {currentRole && (
                    <span className="flex items-center gap-1.5 text-sm text-[#4b4b4b]">
                      <Briefcase className="w-3.5 h-3.5 shrink-0" />
                      {currentRole.job_title} · {currentRole.company_name}
                    </span>
                  )}
                  {location && (
                    <span className="flex items-center gap-1 text-sm text-[#808080]">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />{location}
                    </span>
                  )}
                  {portfolio && (
                    <a href={portfolio} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-[#808080] hover:text-[#0a2412] transition-colors">
                      <Link2 className="w-3.5 h-3.5" />
                      {portfolio.replace(/^https?:\/\//, "")}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Incomplete warning */}
          {!isProfileComplete && (
            <div className="bg-[#fffde6] border border-[#e8d800]/30 rounded-[20px] px-5 py-3.5 flex items-center gap-3 mb-3">
              <AlertTriangle className="w-4 h-4 text-[#9a7800] shrink-0" />
              <p className="text-sm text-[#5a4800] flex-1">Complete your profile to show up in searches.</p>
              <button
                onClick={() => setShowEditProfile(true)}
                className="text-xs font-semibold px-3 py-1.5 rounded-[8px] bg-[#c1cc5a] text-[#0a2412] hover:bg-[#c1cc5a]/90 transition active:scale-[0.97] shrink-0"
              >
                Complete now
              </button>
            </div>
          )}

          {/* Tabs */}
          <div className="mb-5 w-full overflow-x-auto border-b border-[#eceae3]">
            <div className="inline-flex min-w-max items-end gap-10">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative pb-3 pt-1 text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? "text-[#0a2412]"
                      : "text-[#5f5d54] hover:text-[#0a2412]"
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.key && (
                    <span className="absolute bottom-[-1px] left-0 h-[2px] w-full bg-[#0a2412]" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {activeTab === "about" && (
            <div className="space-y-5 animate-fade-up">
              {/* Summary */}
              {summary && (
                <div className="bg-white rounded-[20px] px-7 py-6">
                  <h2 className="text-xs font-bold text-[#808080] uppercase tracking-wider mb-3">About</h2>
                  <p className="text-sm text-[#4b4b4b] leading-relaxed whitespace-pre-wrap">{summary}</p>
                </div>
              )}
              {!summary && (
                <EmptySection title="No about section yet" description="Add a short summary so people understand your background and goals." actionLabel="Edit profile" onAction={() => setShowEditProfile(true)} />
              )}
            </div>
          )}

          {activeTab === "experience" && (
            <div className="animate-fade-up">
              <div className="bg-white rounded-[20px] overflow-hidden">
                <div className="flex items-center justify-between px-7 pt-6 pb-4 border-b border-[#f5f5f5]">
                  <h2 className="text-xs font-bold text-[#808080] uppercase tracking-wider">Experience</h2>
                  <button
                    onClick={() => setShowAddExp(true)}
                    className="w-9 h-9 rounded-[8px] bg-[#f0f0f0] flex items-center justify-center hover:bg-[#e0e0e0] transition-colors"
                  >
                    <Plus className="w-4 h-4 text-[#292929]" />
                  </button>
                </div>

                {expList.length === 0 ? (
                  <div className="px-7 py-10 text-center">
                    <p className="text-sm text-[#808080] mb-4">No experience added yet</p>
                    <button
                      onClick={() => setShowAddExp(true)}
                      className="px-5 py-2.5 rounded-[10px] bg-[#c1cc5a] text-[#0a2412] text-sm font-semibold hover:bg-[#c1cc5a]/90 transition active:scale-[0.97]"
                    >
                      Add experience
                    </button>
                  </div>
                ) : (
                  <div className="px-7 pb-4 divide-y divide-[#f5f5f5]">
                    {expList.map((exp) => (
                      <ExperienceCard key={exp.id} exp={exp} onEdit={() => setEditingExp(exp)} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "education" && (
            <div className="animate-fade-up">
              <div className="bg-white rounded-[20px] overflow-hidden">
                <div className="flex items-center justify-between px-7 pt-6 pb-4 border-b border-[#f5f5f5]">
                  <h2 className="text-xs font-bold text-[#808080] uppercase tracking-wider">Education</h2>
                  <button
                    onClick={() => setShowAddEdu(true)}
                    className="w-9 h-9 rounded-[8px] bg-[#f0f0f0] flex items-center justify-center hover:bg-[#e0e0e0] transition-colors"
                  >
                    <Plus className="w-4 h-4 text-[#292929]" />
                  </button>
                </div>

                {eduList.length === 0 ? (
                  <div className="px-7 py-10 text-center">
                    <p className="text-sm text-[#808080] mb-4">No education added yet</p>
                    <button
                      onClick={() => setShowAddEdu(true)}
                      className="px-5 py-2.5 rounded-[10px] bg-[#c1cc5a] text-[#0a2412] text-sm font-semibold hover:bg-[#c1cc5a]/90 transition active:scale-[0.97]"
                    >
                      Add education
                    </button>
                  </div>
                ) : (
                  <div className="px-7 pb-4 divide-y divide-[#f5f5f5]">
                    {eduList.map((edu) => (
                      <EducationCard key={edu.id} edu={edu} onEdit={() => setEditingEdu(edu)} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "projects" && (
            <div className="animate-fade-up">
              <div className="bg-white rounded-[20px] overflow-hidden">
                <div className="flex items-center justify-between px-7 pt-6 pb-4 border-b border-[#f5f5f5]">
                  <h2 className="text-xs font-bold text-[#808080] uppercase tracking-wider">Projects</h2>
                  <button
                    onClick={() => setShowAddProject(true)}
                    className="w-9 h-9 rounded-[8px] bg-[#f0f0f0] flex items-center justify-center hover:bg-[#e0e0e0] transition-colors"
                  >
                    <Plus className="w-4 h-4 text-[#292929]" />
                  </button>
                </div>

                {projectList.length === 0 ? (
                  <div className="px-7 py-10 text-center">
                    <p className="text-sm text-[#808080] mb-4">No projects added yet</p>
                    <button
                      onClick={() => setShowAddProject(true)}
                      className="px-5 py-2.5 rounded-[10px] bg-[#c1cc5a] text-[#0a2412] text-sm font-semibold hover:bg-[#c1cc5a]/90 transition active:scale-[0.97]"
                    >
                      Add project
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-4 px-7 py-6 sm:grid-cols-2">
                    {projectList.map((project) => (
                      <ProjectCard key={project.id} project={project} onEdit={() => setEditingProject(project)} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "certifications" && (
            <div className="animate-fade-up">
              <div className="bg-white rounded-[20px] overflow-hidden">
                <div className="flex items-center justify-between px-7 pt-6 pb-4 border-b border-[#f5f5f5]">
                  <h2 className="text-xs font-bold text-[#808080] uppercase tracking-wider">Certifications</h2>
                  <button
                    onClick={() => setShowAddCert(true)}
                    className="w-9 h-9 rounded-[8px] bg-[#f0f0f0] flex items-center justify-center hover:bg-[#e0e0e0] transition-colors"
                  >
                    <Plus className="w-4 h-4 text-[#292929]" />
                  </button>
                </div>

                {certList.length === 0 ? (
                  <div className="px-7 py-10 text-center">
                    <p className="text-sm text-[#808080] mb-4">No certifications added yet</p>
                    <button
                      onClick={() => setShowAddCert(true)}
                      className="px-5 py-2.5 rounded-[10px] bg-[#c1cc5a] text-[#0a2412] text-sm font-semibold hover:bg-[#c1cc5a]/90 transition active:scale-[0.97]"
                    >
                      Add certification
                    </button>
                  </div>
                ) : (
                  <div className="px-7 pb-4 divide-y divide-[#f5f5f5]">
                    {certList.map((cert) => (
                      <CertificationCard key={cert.id} cert={cert} onEdit={() => setEditingCert(cert)} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Right sidebar ── */}
        <div className="w-[320px] shrink-0 space-y-3 hidden lg:block">

          {/* Skills */}
          <div className="bg-white rounded-[20px]">
            <div className="flex items-center justify-between px-5 py-4">
              <h3 className="text-[11px] font-semibold text-[#808080] uppercase tracking-wider">Skills</h3>
              <button
                onClick={() => setShowSkills(true)}
                className="w-8 h-8 rounded-[8px] bg-[#f0f0f0] flex items-center justify-center hover:bg-[#e0e0e0] transition-colors"
              >
                <Plus className="w-4 h-4 text-[#292929]" />
              </button>
            </div>
            <div className="px-5 pb-5">
              {skillList.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-xs text-[#808080] mb-3">No skills listed yet</p>
                  <button
                    onClick={() => setShowSkills(true)}
                    className="text-sm font-medium px-4 py-2 rounded-[10px] bg-[#c1cc5a] text-[#0a2412] hover:bg-[#c1cc5a]/90 transition-colors"
                  >
                    Add skills
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {skillList.map((skill) => (
                    <button
                      key={skill}
                      onClick={() => setShowSkills(true)}
                      className="text-[13px] px-3 py-1.5 rounded-[8px] bg-[#fafaf8] text-[#0a2412] font-medium hover:bg-[#f0ede8] transition active:scale-[0.97]"
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Networking */}
          <div className="bg-white rounded-[20px]">
            <div className="flex items-center justify-between px-5 py-4">
              <h3 className="text-[11px] font-semibold text-[#808080] uppercase tracking-wider">Networking</h3>
              <button
                onClick={() => setShowNetworking(true)}
                className="w-8 h-8 rounded-[8px] bg-[#f0f0f0] flex items-center justify-center hover:bg-[#e0e0e0] transition-colors"
              >
                <Plus className="w-4 h-4 text-[#292929]" />
              </button>
            </div>
            <div className="px-5 pb-5">
              {profileData?.linkedin_url || profileData?.portfolio_url || profileData?.phone ? (
                <div className="flex gap-2 flex-wrap">
                  {profileData?.linkedin_url && (
                    <a href={profileData.linkedin_url} target="_blank" rel="noopener noreferrer"
                      className="w-8 h-8 rounded-full bg-[#0077b5] flex items-center justify-center text-white text-xs font-bold hover:opacity-90 transition-opacity">
                      in
                    </a>
                  )}
                  {profileData?.phone && (
                    <a href={`tel:${profileData.phone}`}
                      className="w-8 h-8 rounded-full bg-[#25D366] flex items-center justify-center text-white text-xs font-bold hover:opacity-90 transition-opacity">
                      W
                    </a>
                  )}
                  {profileData?.portfolio_url && (
                    <a href={profileData.portfolio_url} target="_blank" rel="noopener noreferrer"
                      className="w-8 h-8 rounded-full bg-[#292929] flex items-center justify-center text-white text-xs font-bold hover:opacity-90 transition-opacity">
                      ↗
                    </a>
                  )}
                </div>
              ) : (
                <div className="text-center py-3">
                  <p className="text-xs text-[#808080] mb-2.5">Add your social & contact links</p>
                  <button
                    onClick={() => setShowNetworking(true)}
                    className="text-sm font-medium px-4 py-2 rounded-[10px] bg-[#c1cc5a] text-[#0a2412] hover:bg-[#c1cc5a]/90 transition-colors"
                  >
                    Add links
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showEditProfile && (
        <EditProfileModal profile={profileData} userId={userId} onSave={setProfileData} onClose={() => setShowEditProfile(false)} />
      )}
      {(showAddExp || editingExp) && (
        <ExperienceModal
          item={editingExp}
          onSave={handleExpSave}
          onDelete={(id) => setExpList((prev) => prev.filter((e) => e.id !== id))}
          onClose={() => { setShowAddExp(false); setEditingExp(null); }}
        />
      )}
      {(showAddEdu || editingEdu) && (
        <EducationModal
          item={editingEdu}
          onSave={handleEduSave}
          onDelete={(id) => setEduList((prev) => prev.filter((e) => e.id !== id))}
          onClose={() => { setShowAddEdu(false); setEditingEdu(null); }}
        />
      )}
      {(showAddProject || editingProject) && (
        <ProjectModal
          item={editingProject}
          onSave={handleProjectSave}
          onDelete={(id) => setProjectList((prev) => prev.filter((p) => p.id !== id))}
          onClose={() => { setShowAddProject(false); setEditingProject(null); }}
        />
      )}
      {(showAddCert || editingCert) && (
        <CertificationModal
          item={editingCert}
          onSave={handleCertSave}
          onDelete={(id) => setCertList((prev) => prev.filter((c) => c.id !== id))}
          onClose={() => { setShowAddCert(false); setEditingCert(null); }}
        />
      )}
      {showSkills && <SkillsModal skills={skillList} onUpdate={setSkillList} onClose={() => setShowSkills(false)} />}
      {showNetworking && <NetworkingModal profile={profileData} onSave={setProfileData} onClose={() => setShowNetworking(false)} />}
      {showCVUpload && (
        <CVUploadModal
          onClose={() => setShowCVUpload(false)}
          onUploaded={refreshCVs}
        />
      )}
    </div>
  );
}

function ExperienceCard({ exp, onEdit }: { exp: ExperienceItem; onEdit: () => void }) {
  const achievements = Array.isArray(exp.achievements) ? exp.achievements as string[] : [];
  return (
    <div className="py-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-base font-bold text-[#1c1c1c] leading-snug">{exp.job_title}</p>
            {exp.is_current && (
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-[4px] bg-[#f7fcca] text-[#0a2412] tracking-wide uppercase">Now</span>
            )}
          </div>
          <p className="text-sm text-[#4b4b4b] mt-0.5">
            {exp.company_name}
            {exp.location && <span className="text-[#a0a0a0]"> · {exp.location}</span>}
          </p>
          <p className="text-xs text-[#a0a0a0] mt-0.5">
            {fmtDate(exp.start_date)} – {exp.is_current ? "Present" : fmtDate(exp.end_date)}
          </p>
        </div>
        <button
          onClick={onEdit}
          className="text-xs font-medium px-2.5 py-1.5 rounded-[8px] bg-[#f7fcca] text-[#4b4b4b] hover:bg-[#eef9a0] transition-colors shrink-0 whitespace-nowrap mt-0.5"
        >
          Edit
        </button>
      </div>

      {exp.description && (
        <p className="text-sm text-[#4b4b4b] mt-2.5 leading-relaxed">{exp.description}</p>
      )}

      {achievements.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {achievements.map((bullet, i) => (
            <li key={i} className="text-sm text-[#4b4b4b] flex gap-2 leading-relaxed">
              <span className="shrink-0 text-[#c1cc5a] font-bold mt-[1px] select-none">·</span>
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EducationCard({ edu, onEdit }: { edu: EducationItem; onEdit: () => void }) {
  return (
    <div className="py-5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-base font-bold text-[#1c1c1c] leading-snug">{edu.degree ?? edu.institution}</p>
        {edu.degree && (
          <p className="text-sm text-[#4b4b4b] mt-0.5">
            {edu.institution}{edu.field_of_study ? ` · ${edu.field_of_study}` : ""}
          </p>
        )}
        <p className="text-xs text-[#a0a0a0] mt-0.5">
          {fmtDate(edu.start_date)} – {fmtDate(edu.end_date) || "Present"}
        </p>
      </div>
      <button
        onClick={onEdit}
        className="text-xs font-medium px-2.5 py-1.5 rounded-[8px] bg-[#f7fcca] text-[#4b4b4b] hover:bg-[#eef9a0] transition-colors shrink-0 whitespace-nowrap mt-0.5"
      >
        Edit
      </button>
    </div>
  );
}

function ProjectCard({ project, onEdit }: { project: ProjectItem; onEdit: () => void }) {
  return (
    <div className="overflow-hidden rounded-[16px] border border-[#f0f0f0] bg-[#fafaf8]">
      {project.image_url && (
        <div
          className="aspect-[16/10] bg-[#eceae3]"
          style={{ backgroundImage: `url(${project.image_url})`, backgroundSize: "cover", backgroundPosition: "center" }}
        />
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-bold text-[#1c1c1c] leading-snug">{project.title}</p>
            {project.description && (
              <p className="mt-2 text-sm leading-relaxed text-[#4b4b4b]">{project.description}</p>
            )}
          </div>
          <button
            onClick={onEdit}
            className="text-xs font-medium px-2.5 py-1.5 rounded-[8px] bg-[#f7fcca] text-[#4b4b4b] hover:bg-[#eef9a0] transition-colors shrink-0 whitespace-nowrap"
          >
            Edit
          </button>
        </div>
        {project.project_url && (
          <a
            href={project.project_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#0a2412] hover:underline"
          >
            Open project
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

function CertificationCard({ cert, onEdit }: { cert: CertificationItem; onEdit: () => void }) {
  return (
    <div className="py-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-bold text-[#1c1c1c] leading-snug">{cert.name}</p>
          {cert.issuer && (
            <p className="text-sm text-[#4b4b4b] mt-0.5">{cert.issuer}</p>
          )}
          <p className="text-xs text-[#a0a0a0] mt-0.5">
            {fmtDate(cert.issue_date)}
            {cert.expiration_date ? ` - Expires ${fmtDate(cert.expiration_date)}` : ""}
          </p>
          {cert.credential_id && (
            <p className="text-xs text-[#808080] mt-1">Credential ID: {cert.credential_id}</p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          {cert.credential_url && (
            <a
              href={cert.credential_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium px-2.5 py-1.5 rounded-[8px] bg-[#f7fcca] text-[#4b4b4b] hover:bg-[#eef9a0] transition-colors whitespace-nowrap mt-0.5"
            >
              View
            </a>
          )}
          <button
            onClick={onEdit}
            className="text-xs font-medium px-2.5 py-1.5 rounded-[8px] bg-[#f7fcca] text-[#4b4b4b] hover:bg-[#eef9a0] transition-colors whitespace-nowrap mt-0.5"
          >
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptySection({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="bg-white rounded-[20px] px-7 py-16 text-center">
      <p className="text-sm font-medium text-[#292929] mb-1">{title}</p>
      <p className="text-xs text-[#808080]">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-5 py-2.5 rounded-[10px] bg-[#c1cc5a] text-[#0a2412] text-sm font-semibold hover:bg-[#c1cc5a]/90 transition active:scale-[0.97]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
