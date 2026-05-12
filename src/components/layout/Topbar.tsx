"use client";

import { Search, Bell, Heart, MessageCircle, UserPlus, UserCheck, Briefcase, LayoutList, X } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { formatDistanceToNow } from "@/lib/utils";

const RecruiterOnboardingModal = dynamic(
  () => import("@/components/recruiter/RecruiterOnboardingModal"),
  { ssr: false }
);

interface NotificationActor {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  headline: string | null;
}

interface Notification {
  id: string;
  type: string;
  actor_id: string | null;
  entity_id: string | null;
  read: boolean;
  created_at: string;
  actor: NotificationActor | null;
}

interface Props {
  isRecruiter?: boolean;
  userEmail?: string;
}

function notificationMeta(n: Notification): { icon: React.ReactNode; text: string; href?: string } {
  const name = n.actor?.full_name ?? "Someone";
  switch (n.type) {
    case "connection_request":
      return { icon: <UserPlus className="w-3.5 h-3.5 text-[#1a4fd6]" />, text: `${name} sent you a connection request`, href: "/network" };
    case "connection_accepted":
      return { icon: <UserCheck className="w-3.5 h-3.5 text-[#0a7854]" />, text: `${name} accepted your connection request`, href: "/network" };
    case "post_like":
      return { icon: <Heart className="w-3.5 h-3.5 text-[#e05252]" />, text: `${name} liked your post`, href: "/community" };
    case "post_comment":
      return { icon: <MessageCircle className="w-3.5 h-3.5 text-[#8a52e0]" />, text: `${name} commented on your post`, href: "/community" };
    case "message":
      return { icon: <MessageCircle className="w-3.5 h-3.5 text-[#0a7854]" />, text: `New message from ${name}`, href: "/messages" };
    case "job_application":
      return { icon: <Briefcase className="w-3.5 h-3.5 text-[#c05200]" />, text: `Your application was reviewed`, href: "/tracker" };
    case "job_status_change":
      return { icon: <LayoutList className="w-3.5 h-3.5 text-[#0a2412]" />, text: `Application status updated`, href: "/tracker" };
    case "follow":
      return { icon: <UserPlus className="w-3.5 h-3.5 text-[#1a4fd6]" />, text: `${name} started following you`, href: `/u/${n.actor_id}` };
    default:
      return { icon: <Bell className="w-3.5 h-3.5 text-[#8a877b]" />, text: "New notification" };
  }
}

export default function Topbar({ isRecruiter = false, userEmail = "" }: Props) {
  const [query, setQuery] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unread_count ?? 0);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  async function openNotifs() {
    setShowNotifs((o) => !o);
    if (!showNotifs && unreadCount > 0) {
      setLoading(true);
      await fetch("/api/notifications/read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      setLoading(false);
    }
  }

  function handleSearch() {
    const q = query.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  function handleHireClick() {
    if (isRecruiter) {
      router.push("/recruiter/dashboard");
    } else {
      setShowOnboarding(true);
    }
  }

  return (
    <>
      <header className="h-[64px] shrink-0 bg-[rgba(250,250,248,0.9)] border-b border-r border-[#eceae3] flex items-center gap-[12px] px-[28px] relative z-30">
        {/* Search */}
        <div className="bg-white flex items-center gap-[8px] h-[44px] px-[12px] rounded-[8px] border border-[#eceae3] focus-within:border-[#c6f46b] transition-colors flex-1 max-w-[744px]">
          <Search className="w-[14px] h-[14px] text-[#8a877b] shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="search roles, people, communities..."
            className="flex-1 bg-transparent text-[12px] text-[#1a1a16] placeholder:text-[#8a877b] outline-none"
          />
        </div>

        <div className="flex-1" />

        {/* Bell */}
        <div ref={notifRef} className="relative">
          <button
            onClick={openNotifs}
            className={`relative w-[35px] h-[34px] border rounded-[10px] flex items-center justify-center shrink-0 transition-colors ${
              showNotifs ? "bg-[#e8f2eb] border-[#b8dfc4]" : "bg-[#f2fcda] border-[#eceae3] hover:border-[#b8dfc4]"
            }`}
          >
            <Bell className="w-[14px] h-[14px] text-[#0a2412]" />
            {unreadCount > 0 && (
              <span className="absolute -top-[5px] -right-[5px] min-w-[16px] h-[16px] px-[3px] rounded-full bg-[#e05252] text-white text-[9px] font-bold flex items-center justify-center leading-none">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute top-[42px] right-0 w-[340px] bg-white border border-[#eceae3] rounded-[16px] shadow-2xl overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#f5f4f0]">
                <p className="text-[13px] font-semibold text-[#0a2412]">Notifications</p>
                <button onClick={() => setShowNotifs(false)} className="text-[#b0ae9f] hover:text-[#5f5d54] transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="max-h-[420px] overflow-y-auto">
                {loading && (
                  <div className="py-8 text-center text-[12px] text-[#8a877b]">Loading...</div>
                )}
                {!loading && notifications.length === 0 && (
                  <div className="py-10 text-center">
                    <Bell className="w-7 h-7 text-[#d4d0c8] mx-auto mb-2" />
                    <p className="text-[13px] font-medium text-[#5f5d54]">No notifications yet</p>
                    <p className="text-[11px] text-[#b0ae9f] mt-1">Activity from your network will appear here</p>
                  </div>
                )}
                {!loading && notifications.map((n) => {
                  const { icon, text, href } = notificationMeta(n);
                  return (
                    <button
                      key={n.id}
                      onClick={() => { setShowNotifs(false); if (href) router.push(href); }}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[#fafaf8] border-b border-[#f5f4f0] last:border-0 ${
                        !n.read ? "bg-[#f4f9f5]" : ""
                      }`}
                    >
                      <div className="w-7 h-7 rounded-full bg-[#f0ede8] flex items-center justify-center shrink-0 mt-0.5">
                        {icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] text-[#0a2412] leading-snug">{text}</p>
                        <p className="text-[10px] text-[#b0ae9f] mt-0.5">{formatDistanceToNow(n.created_at)}</p>
                      </div>
                      {!n.read && (
                        <div className="w-1.5 h-1.5 rounded-full bg-[#0a2412] shrink-0 mt-1.5" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Hire with us / Recruiter Dashboard */}
        <button
          onClick={handleHireClick}
          className="h-[34px] px-4 bg-[#0a2412] text-[#fafaf8] text-[13px] font-medium rounded-[10px] flex items-center justify-center shrink-0 hover:bg-[#0a2412]/90 transition-colors whitespace-nowrap tracking-[-0.065px]"
        >
          {isRecruiter ? "Recruiting" : "Hire with us"}
        </button>
      </header>

      {showOnboarding && (
        <RecruiterOnboardingModal onClose={() => setShowOnboarding(false)} userEmail={userEmail} />
      )}
    </>
  );
}
