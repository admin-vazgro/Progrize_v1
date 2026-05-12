"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import FeedTab from "./FeedTab";
import ComposeModal from "./ComposeModal";
import CreateRoomModal from "./CreateRoomModal";

interface Room {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  member_count: number;
  is_private: boolean;
}

interface Props {
  userId: string;
  userName: string;
  userHeadline: string;
  userAvatarUrl: string | null;
  joinedRooms: Room[];
  discoverRooms: Room[];
}

type SortTab = "all" | "network" | "latest" | "top" | "boards";

const SORT_TABS: { id: SortTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "network", label: "My network" },
  { id: "latest", label: "Latest" },
  { id: "top", label: "Top this week" },
  { id: "boards", label: "My Boards" },
];

const ROOM_PALETTES = [
  "#0a2412", "#2d1654", "#621010", "#0f4c5c",
  "#3d1a00", "#1a3d00", "#4c0f3d", "#00354c",
];

export function roomColor(name: string): string {
  return ROOM_PALETTES[(name.charCodeAt(0) + name.length) % ROOM_PALETTES.length];
}

export default function CommunityClient({
  userId, userName, userHeadline, userAvatarUrl, joinedRooms: initialJoined, discoverRooms: initialDiscover,
}: Props) {
  const [composeOpen, setComposeOpen] = useState(false);
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [feedKey, setFeedKey] = useState(0);
  const [sortTab, setSortTab] = useState<SortTab>("all");
  const [joinedRooms, setJoinedRooms] = useState(initialJoined);
  const [discoverRooms, setDiscoverRooms] = useState(initialDiscover);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const idx = SORT_TABS.findIndex((t) => t.id === sortTab);
    const el = tabRefs.current[idx];
    if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
  }, [sortTab]);

  const firstName = userName.split(" ")[0];
  const initials = userName.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  async function handleJoin(room: Room) {
    setJoiningId(room.id);
    const res = await fetch(`/api/rooms/${room.slug}/join`, { method: "POST" });
    const data = await res.json();
    if (res.ok && data.joined) {
      setDiscoverRooms((prev) => prev.filter((r) => r.id !== room.id));
      setJoinedRooms((prev) => [...prev, room]);
    }
    setJoiningId(null);
  }

  function handleRoomCreated(room: Room) {
    setJoinedRooms((prev) => [...prev, room]);
    setCreateRoomOpen(false);
  }

  const feedSortBy = sortTab === "latest" ? "latest" : sortTab === "top" ? "top" : sortTab === "boards" ? "boards" : "all";

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#fafaf8]">
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
        <div className="px-8 pt-8 pb-12">

          {/* Page heading */}
          <div className="flex items-end justify-between mb-8">
            <div>
              <h1 className="text-[64px] font-normal tracking-[-0.045em] text-[#0a2412] leading-[67px]">Community</h1>
              <p className="text-[15px] text-[#5f5d54] mt-1">
                {joinedRooms.length > 0 ? (
                  <><span className="font-bold">{joinedRooms.length}</span> room{joinedRooms.length !== 1 ? "s" : ""} joined</>
                ) : (
                  "Join rooms and connect with your community"
                )}
              </p>
            </div>
            <button
              onClick={() => setCreateRoomOpen(true)}
              className="h-[34px] px-[14px] bg-white border border-[#dddbd2] rounded-[10px] text-[13px] font-medium text-[#0a2412] hover:bg-[#f5f4f0] transition-colors"
            >
              + create room
            </button>
          </div>

          {/* Two-column layout */}
          <div className="flex gap-6 items-start">

            {/* Left: compose + tabs + feed */}
            <div className="flex-1 min-w-0 flex flex-col gap-8">

              {/* Compose card */}
              <div className="bg-white rounded-[20px] p-6">
                <div className="mb-6">
                  <h2 className="text-[32px] font-normal tracking-[-0.03em] text-[#0a2412] leading-none">
                    Hey, {firstName}!
                  </h2>
                  <p className="text-[11px] font-light text-[#4b4b4b] mt-2 max-w-[343px] leading-relaxed">
                    Share something with your community — questions, insights, milestones.
                  </p>
                </div>
                <div className="flex gap-4 items-center">
                  {userAvatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={userAvatarUrl} alt={userName} className="w-9 h-9 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-[#0a2412] text-[#c6f46b] flex items-center justify-center text-[11px] font-bold shrink-0 select-none">
                      {initials}
                    </div>
                  )}
                  <div
                    onClick={() => setComposeOpen(true)}
                    className="flex-1 bg-[#fafafa] rounded-tr-[20px] rounded-tl-[20px] rounded-br-[20px] h-[56px] flex items-center px-4 cursor-pointer hover:bg-[#f5f4f0] transition-colors"
                  >
                    <span className="text-[14px] text-[#4b4b4b]">What&apos;s going on there?</span>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="relative flex gap-[45px] items-center border-b border-[#eceae3]">
                {SORT_TABS.map((tab, i) => (
                  <button
                    key={tab.id}
                    ref={(el) => { tabRefs.current[i] = el; }}
                    onClick={() => setSortTab(tab.id)}
                    className={`text-[13px] leading-[1.35] whitespace-nowrap pb-2.5 transition-colors ${
                      sortTab === tab.id ? "font-bold text-[#0a2412]" : "font-medium text-[#5f5d54] hover:text-[#3d3c36]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
                <div
                  className="absolute bottom-[-1px] h-[2px] bg-[#0a2412] transition-all duration-300"
                  style={{ left: indicator.left, width: indicator.width }}
                />
              </div>

              {/* Feed */}
              <FeedTab
                key={`${feedKey}-${sortTab}`}
                userId={userId}
                userName={userName}
                hideCompose
                sortBy={feedSortBy}
                joinedRoomIds={joinedRooms.map((r) => r.id)}
              />
            </div>

            {/* Right sidebar */}
            <div className="w-[277px] shrink-0 hidden lg:flex flex-col gap-6">

              {/* My Rooms card */}
              <div className="bg-white rounded-[20px] p-6">
                <h3 className="text-[20px] font-normal text-[#0a2412] tracking-[-0.05em] leading-none pb-4">
                  My Rooms
                </h3>
                {joinedRooms.length === 0 ? (
                  <p className="text-[13px] text-[#8a877b]">No rooms joined yet.</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {joinedRooms.map((room, i) => (
                      <Link
                        key={room.id}
                        href={`/community/rooms/${room.slug}`}
                        className={`flex items-center gap-2 pb-4 hover:opacity-70 transition-opacity ${
                          i < joinedRooms.length - 1 ? "border-b border-[#ebebeb]" : "pb-0"
                        }`}
                      >
                        <span className="flex-1 text-[14px] font-normal text-[#292929] truncate">{room.name}</span>
                        <div className="bg-white h-[27px] px-3 rounded-[10px] flex items-center justify-center shrink-0">
                          <span className="text-[12px] font-medium text-[#0a2412]">{room.member_count}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Discover Rooms card */}
              {discoverRooms.length > 0 && (
                <div className="bg-white rounded-[20px] p-6">
                  <h3 className="text-[20px] font-normal text-[#0a2412] tracking-[-0.05em] leading-none pb-4">
                    Discover Rooms
                  </h3>
                  <div className="flex flex-col gap-4">
                    {discoverRooms.map((room, i) => (
                      <div
                        key={room.id}
                        className={`flex items-center gap-2 pb-4 ${i < discoverRooms.length - 1 ? "border-b border-[#ebebeb]" : "pb-0"}`}
                      >
                        <span className="flex-1 text-[14px] font-normal text-[#292929] truncate">{room.name}</span>
                        <button
                          onClick={() => handleJoin(room)}
                          disabled={joiningId === room.id}
                          className="h-[27px] w-[62px] bg-white border border-[#dddbd2] rounded-[10px] text-[12px] font-medium text-[#0a2412] hover:bg-[#f5f4f0] disabled:opacity-50 transition-colors shrink-0"
                        >
                          {joiningId === room.id ? "…" : "Join"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ComposeModal
        isOpen={composeOpen}
        onClose={() => setComposeOpen(false)}
        userName={userName}
        userHeadline={userHeadline}
        onPosted={() => setFeedKey((k) => k + 1)}
      />
      <CreateRoomModal
        isOpen={createRoomOpen}
        onClose={() => setCreateRoomOpen(false)}
        onCreated={handleRoomCreated}
      />
    </div>
  );
}
