"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2, Users, Bell, Check } from "lucide-react";
import Link from "next/link";
import ConnectButton from "./ConnectButton";
import type { Relationship } from "./ConnectButton";
import { formatDistanceToNow } from "@/lib/utils";

type Tab = "discover" | "connections" | "requests" | "notifications";

interface Person {
  id: string;
  full_name: string | null;
  headline: string | null;
  location: string | null;
  avatar_url: string | null;
  connection_count: number;
  follower_count: number;
  following: boolean;
}

interface RequestEntry {
  id: string;
  created_at: string;
  profile: { id: string; full_name: string | null; headline: string | null; avatar_url: string | null; location: string | null } | null;
}

interface Connection {
  id: string;
  request_id: string;
  connected_at: string;
  profile: { id: string; full_name: string | null; headline: string | null; avatar_url: string | null; location: string | null } | null;
}

interface Notification {
  id: string;
  type: string;
  read: boolean;
  created_at: string;
  entity_id: string | null;
  actor: { id: string; full_name: string | null; avatar_url: string | null } | null;
}

function Avatar({ name, url, size = 40 }: { name: string | null; url: string | null; size?: number }) {
  const initials = (name ?? "?").split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  if (url) {
    return <img src={url} alt={name ?? ""} style={{ width: size, height: size }} className="rounded-full object-cover shrink-0" />;
  }
  return (
    <div className="rounded-full bg-[#0a2412] text-[#c6f46b] flex items-center justify-center font-bold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.3 }}>
      {initials}
    </div>
  );
}

function notifText(n: Notification) {
  switch (n.type) {
    case "connection_request": return "sent you a connection request";
    case "connection_accepted": return "accepted your connection request";
    case "follow": return "started following you";
    case "post_like": return "liked your post";
    case "comment": return "commented on your post";
    default: return "";
  }
}

interface Props { pendingCount: number }

export default function NetworkClient({ pendingCount: initPendingCount }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("discover");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const [search, setSearch] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);

  const [connections, setConnections] = useState<Connection[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);

  const [received, setReceived] = useState<RequestEntry[]>([]);
  const [sent, setSent] = useState<RequestEntry[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(initPendingCount);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifsLoading, setNotifsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const TABS: { id: Tab; label: string; badge?: number }[] = [
    { id: "discover", label: "Discover" },
    { id: "connections", label: "Connections" },
    { id: "requests", label: "Requests", badge: pendingCount },
  ];

  useEffect(() => {
    const idx = TABS.findIndex((t) => t.id === activeTab);
    const el = tabRefs.current[idx];
    if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
  }, [activeTab, pendingCount, unreadCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch discover people
  useEffect(() => {
    if (activeTab !== "discover") return;
    setPeopleLoading(true);
    fetch(`/api/people?q=${encodeURIComponent(search)}&limit=24`)
      .then((r) => r.json())
      .then((d) => setPeople(d.people ?? []))
      .catch(() => {})
      .finally(() => setPeopleLoading(false));
  }, [activeTab, search]);

  // Fetch connections
  useEffect(() => {
    if (activeTab !== "connections") return;
    setConnectionsLoading(true);
    fetch("/api/connections")
      .then((r) => r.json())
      .then((d) => setConnections(d.connections ?? []))
      .catch(() => {})
      .finally(() => setConnectionsLoading(false));
  }, [activeTab]);

  // Fetch requests
  useEffect(() => {
    if (activeTab !== "requests") return;
    setRequestsLoading(true);
    fetch("/api/connections/requests")
      .then((r) => r.json())
      .then((d) => {
        setReceived(d.received ?? []);
        setSent(d.sent ?? []);
        setPendingCount((d.received ?? []).length);
      })
      .catch(() => {})
      .finally(() => setRequestsLoading(false));
  }, [activeTab]);

  // Fetch notifications
  useEffect(() => {
    if (activeTab !== "notifications") return;
    setNotifsLoading(true);
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => { setNotifications(d.notifications ?? []); setUnreadCount(d.unread_count ?? 0); })
      .catch(() => {})
      .finally(() => setNotifsLoading(false));
  }, [activeTab]);

  async function markAllRead() {
    await fetch("/api/notifications/read", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  function handleAccept(reqId: string, profileId: string) {
    setReceived((prev) => prev.filter((r) => r.id !== reqId));
    setPendingCount((c) => Math.max(0, c - 1));
  }

  function handleRejectOrWithdraw(reqId: string) {
    setReceived((prev) => prev.filter((r) => r.id !== reqId));
    setSent((prev) => prev.filter((r) => r.id !== reqId));
    setPendingCount((c) => Math.max(0, c - 1));
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#fafaf8]">
      {/* Header */}
      <div className="px-8 pt-8 pb-3 shrink-0">
        <h1 className="text-[64px] font-normal tracking-[-0.045em] text-[#0a2412] leading-[67px]">Network</h1>
        <p className="text-[15px] text-[#5f5d54] mt-1">Build your professional network.</p>
      </div>

      {/* Tab bar */}
      <div className="px-8 shrink-0">
        <div className="relative flex gap-[36px] border-b border-[#eceae3]">
          {TABS.map((tab, i) => (
            <button
              key={tab.id}
              ref={(el) => { tabRefs.current[i] = el; }}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-[6px] text-[13px] pb-[8px] transition-colors ${
                activeTab === tab.id ? "font-bold text-[#0a2412]" : "font-medium text-[#5f5d54] hover:text-[#3d3c36]"
              }`}
            >
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#0a2412] text-[#c6f46b] text-[10px] font-bold flex items-center justify-center">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
          <div
            className="absolute bottom-[-1px] h-[2px] bg-[#0a2412] transition-all duration-300"
            style={{ left: indicator.left, width: indicator.width }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-8 py-6">

        {/* DISCOVER */}
        {activeTab === "discover" && (
          <div className="flex flex-col gap-5">
            <div className="relative max-w-[400px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a877b]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or role…"
                className="w-full h-[40px] pl-9 pr-4 rounded-[10px] bg-white border border-[#eceae3] text-sm text-[#292929] placeholder:text-[#8a877b] outline-none focus:border-[#0a2412] transition-colors"
              />
            </div>

            {peopleLoading ? (
              <div className="flex flex-col gap-2 max-w-[700px]">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-[14px] h-[64px] animate-pulse" />
                ))}
              </div>
            ) : people.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-14 h-14 rounded-[18px] bg-gradient-to-br from-[#e8eeff] to-[#c4cef7] shadow-[0_4px_12px_rgba(26,79,214,0.12),0_1px_3px_rgba(26,79,214,0.08)] flex items-center justify-center mx-auto mb-4 text-2xl select-none">
                  👥
                </div>
                <p className="text-[14px] font-semibold text-[#292929]">No people found</p>
                <p className="text-[13px] text-[#8a877b] mt-1">Try a different search term.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-w-[700px]">
                {people.map((person) => (
                  <div key={person.id} className="bg-white rounded-[14px] px-4 py-3 flex items-center gap-4">
                    <Link href={`/u/${person.id}`}>
                      <Avatar name={person.full_name ?? null} url={person.avatar_url ?? null} size={40} />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/u/${person.id}`}>
                        <p className="text-[14px] font-bold text-[#0a2412] hover:underline truncate leading-tight">
                          {person.full_name ?? "Unknown"}
                        </p>
                      </Link>
                      <div className="flex items-center gap-2 mt-0.5">
                        {person.headline && (
                          <p className="text-[12px] text-[#5f5d54] truncate">{person.headline}</p>
                        )}
                        {person.connection_count > 0 && (
                          <span className="text-[11px] text-[#8a877b] shrink-0">
                            · {person.connection_count} connection{person.connection_count !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                    <ConnectButton
                      targetUserId={person.id}
                      initialRelationship="none"
                      initialFollowing={person.following}
                      size="sm"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CONNECTIONS */}
        {activeTab === "connections" && (
          <div className="flex flex-col gap-3 max-w-[700px]">
            {connectionsLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => <div key={i} className="bg-white rounded-[16px] h-[72px] animate-pulse" />)}
              </div>
            ) : connections.length === 0 ? (
              <div className="text-center py-20">
                <Users className="w-8 h-8 text-[#b0ae9f] mx-auto mb-3" />
                <p className="text-[14px] font-semibold text-[#292929]">No connections yet</p>
                <p className="text-[13px] text-[#8a877b] mt-1">Discover people and send connection requests.</p>
              </div>
            ) : (
              connections.map((conn) => (
                <div key={conn.id} className="bg-white rounded-[16px] px-5 py-4 flex items-center gap-4">
                  <Link href={`/u/${conn.profile?.id}`}>
                    <Avatar name={conn.profile?.full_name ?? null} url={conn.profile?.avatar_url ?? null} size={44} />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/u/${conn.profile?.id}`}>
                      <p className="text-[14px] font-bold text-[#0a2412] hover:underline truncate">
                        {conn.profile?.full_name ?? "Unknown"}
                      </p>
                    </Link>
                    {conn.profile?.headline && (
                      <p className="text-[12px] text-[#5f5d54] truncate">{conn.profile.headline}</p>
                    )}
                  </div>
                  <ConnectButton
                    targetUserId={conn.profile?.id ?? ""}
                    initialRelationship="connected"
                    initialRequestId={conn.request_id}
                    size="sm"
                  />
                </div>
              ))
            )}
          </div>
        )}

        {/* REQUESTS */}
        {activeTab === "requests" && (
          <div className="flex flex-col gap-6 max-w-[700px]">
            {requestsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-[16px] h-[72px] animate-pulse" />)}
              </div>
            ) : (
              <>
                {received.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-[#8a877b] uppercase tracking-wider mb-3">
                      Received · {received.length}
                    </p>
                    <div className="flex flex-col gap-3">
                      {received.map((req) => (
                        <div key={req.id} className="bg-white rounded-[16px] px-5 py-4 flex items-center gap-4">
                          <Link href={`/u/${req.profile?.id}`}>
                            <Avatar name={req.profile?.full_name ?? null} url={req.profile?.avatar_url ?? null} size={44} />
                          </Link>
                          <div className="flex-1 min-w-0">
                            <Link href={`/u/${req.profile?.id}`}>
                              <p className="text-[14px] font-bold text-[#0a2412] hover:underline truncate">
                                {req.profile?.full_name ?? "Unknown"}
                              </p>
                            </Link>
                            {req.profile?.headline && (
                              <p className="text-[12px] text-[#5f5d54] truncate">{req.profile.headline}</p>
                            )}
                          </div>
                          <ConnectButton
                            targetUserId={req.profile?.id ?? ""}
                            initialRelationship="pending_received"
                            initialRequestId={req.id}
                            size="sm"
                            onAction={(action) => {
                              setReceived((prev) => prev.filter((r) => r.id !== req.id));
                              setPendingCount((c) => Math.max(0, c - 1));
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {sent.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-[#8a877b] uppercase tracking-wider mb-3">
                      Sent · {sent.length}
                    </p>
                    <div className="flex flex-col gap-3">
                      {sent.map((req) => (
                        <div key={req.id} className="bg-white rounded-[16px] px-5 py-4 flex items-center gap-4">
                          <Link href={`/u/${req.profile?.id}`}>
                            <Avatar name={req.profile?.full_name ?? null} url={req.profile?.avatar_url ?? null} size={44} />
                          </Link>
                          <div className="flex-1 min-w-0">
                            <Link href={`/u/${req.profile?.id}`}>
                              <p className="text-[14px] font-bold text-[#0a2412] hover:underline truncate">
                                {req.profile?.full_name ?? "Unknown"}
                              </p>
                            </Link>
                            {req.profile?.headline && (
                              <p className="text-[12px] text-[#5f5d54] truncate">{req.profile.headline}</p>
                            )}
                          </div>
                          <ConnectButton
                            targetUserId={req.profile?.id ?? ""}
                            initialRelationship="pending_sent"
                            initialRequestId={req.id}
                            size="sm"
                            onAction={() => setSent((prev) => prev.filter((r) => r.id !== req.id))}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {received.length === 0 && sent.length === 0 && (
                  <div className="text-center py-20">
                    <Users className="w-8 h-8 text-[#b0ae9f] mx-auto mb-3" />
                    <p className="text-[14px] font-semibold text-[#292929]">No pending requests</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* NOTIFICATIONS */}
        {activeTab === "notifications" && (
          <div className="flex flex-col gap-3 max-w-[700px]">
            {unreadCount > 0 && (
              <div className="flex justify-end">
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1.5 text-[12px] text-[#5f5d54] hover:text-[#0a2412] transition-colors"
                >
                  <Check className="w-3 h-3" />
                  Mark all read
                </button>
              </div>
            )}

            {notifsLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => <div key={i} className="bg-white rounded-[16px] h-[64px] animate-pulse" />)}
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-20">
                <Bell className="w-8 h-8 text-[#b0ae9f] mx-auto mb-3" />
                <p className="text-[14px] font-semibold text-[#292929]">No notifications</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-center gap-3 px-5 py-4 rounded-[16px] ${n.read ? "bg-white" : "bg-[#f0fdf4]"}`}
                >
                  {!n.read && <div className="w-2 h-2 rounded-full bg-[#0a2412] shrink-0" />}
                  <Link href={`/u/${n.actor?.id}`}>
                    <Avatar name={n.actor?.full_name ?? null} url={n.actor?.avatar_url ?? null} size={36} />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-[#292929]">
                      <Link href={`/u/${n.actor?.id}`} className="font-bold hover:underline">
                        {n.actor?.full_name ?? "Someone"}
                      </Link>
                      {" "}{notifText(n)}
                    </p>
                    <p className="text-[11px] text-[#8a877b] mt-0.5">{formatDistanceToNow(n.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
