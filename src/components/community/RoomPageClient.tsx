"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Users, Lock, Loader2, Hash, Settings, Shield, ArrowUpRight } from "lucide-react";
import FeedTab from "./FeedTab";
import ManageRoomModal from "./ManageRoomModal";
import { roomColor } from "./CommunityClient";

interface Room {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_private: boolean;
  member_count: number;
  post_count: number;
  creator_id: string | null;
}

interface JoinedRoom {
  id: string;
  name: string;
  slug: string;
}

interface Props {
  room: Room;
  userId: string;
  userName: string;
  userRole: "admin" | "moderator" | "member" | null;
  joinedRooms: JoinedRoom[];
}

export default function RoomPageClient({ room, userId, userName, userRole, joinedRooms }: Props) {
  const searchParams = useSearchParams();
  const [isJoined, setIsJoined] = useState(userRole !== null);
  const [memberCount, setMemberCount] = useState(room.member_count);
  const [joining, setJoining] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [roomData, setRoomData] = useState(room);

  async function toggleJoin(inviteToken?: string) {
    setJoining(true);
    const res = await fetch(`/api/rooms/${roomData.slug}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inviteToken ? { invite_token: inviteToken } : {}),
    });
    const data = await res.json();
    if (res.ok) {
      setIsJoined(data.joined);
      setMemberCount((c) => c + (data.joined ? 1 : -1));
    }
    setJoining(false);
  }

  // Auto-join via invite link
  useEffect(() => {
    const token = searchParams.get("invite");
    if (token && !isJoined) toggleJoin(token);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#fafaf8]">
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
        <div className="px-8 pt-8 pb-12">

          {/* Room heading row */}
          <div className="flex items-end justify-between mb-8">
            <div>
              {/* Colour accent bar */}
              <div
                className="w-[40px] h-[5px] rounded-full mb-3"
                style={{ backgroundColor: roomColor(roomData.name) }}
              />
              <div className="flex items-center gap-3">
                <h1 className="text-[64px] font-normal tracking-[-0.045em] text-[#0a2412] leading-[67px]">
                  {roomData.name}
                </h1>
                {roomData.is_private && <Lock className="w-5 h-5 text-[#8a877b] mb-1 shrink-0" />}
                {userRole === "admin" && (
                  <span className="mb-1 text-[9px] font-bold px-1.5 py-0.5 rounded-[4px] bg-[#f7fcca] text-[#0a2412] uppercase tracking-wide flex items-center gap-0.5 shrink-0">
                    <Shield className="w-2.5 h-2.5" /> Admin
                  </span>
                )}
                {userRole === "moderator" && (
                  <span className="mb-1 text-[9px] font-bold px-1.5 py-0.5 rounded-[4px] bg-[#e8f2eb] text-[#0a7854] uppercase tracking-wide flex items-center gap-0.5 shrink-0">
                    <Shield className="w-2.5 h-2.5" /> Mod
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-[13px] text-[#5f5d54]">
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {memberCount.toLocaleString()} members</span>
                <span className="flex items-center gap-1"><Hash className="w-3.5 h-3.5" /> {roomData.post_count} posts</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pb-1">
              {userRole === "admin" && (
                <button
                  onClick={() => setManageOpen(true)}
                  className="h-[34px] px-[14px] bg-white border border-[#dddbd2] rounded-[10px] text-[13px] font-medium text-[#0a2412] flex items-center gap-1.5 hover:bg-[#f5f4f0] transition-colors"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Manage
                </button>
              )}
              <button
                onClick={toggleJoin}
                disabled={joining}
                className={`h-[34px] px-[14px] rounded-[10px] text-[13px] font-medium flex items-center gap-1.5 transition-colors ${
                  isJoined
                    ? "bg-white border border-[#dddbd2] text-[#5f5d54] hover:border-red-200 hover:text-red-500"
                    : "bg-[#0a2412] text-[#fafaf8] hover:bg-[#0a2412]/90"
                }`}
              >
                {joining && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isJoined ? "Joined" : "Join Room"}
              </button>
            </div>
          </div>

          {/* Two-column layout */}
          <div className="flex gap-6 items-start">

            {/* Left: feed */}
            <div className="flex-1 min-w-0">
              {isJoined || !roomData.is_private ? (
                <FeedTab userId={userId} userName={userName} roomId={roomData.id} />
              ) : (
                <div className="bg-white rounded-[20px] p-12 text-center">
                  <div
                    className="w-10 h-10 rounded-[10px] mx-auto mb-4 flex items-center justify-center"
                    style={{ backgroundColor: roomColor(roomData.name) + "20" }}
                  >
                    <Lock className="w-5 h-5" style={{ color: roomColor(roomData.name) }} />
                  </div>
                  <p className="text-[14px] font-semibold text-[#292929] mb-1">Private Room</p>
                  <p className="text-[12px] text-[#8a877b] mb-5">Join to see and participate in discussions.</p>
                  <button
                    onClick={toggleJoin}
                    disabled={joining}
                    className="h-[34px] px-6 rounded-[10px] text-[13px] font-medium bg-[#0a2412] text-[#fafaf8] hover:bg-[#0a2412]/90 disabled:opacity-50 transition-colors"
                  >
                    {joining ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : "Join Room"}
                  </button>
                </div>
              )}
            </div>

            {/* Right sidebar */}
            <div className="w-[302px] shrink-0 hidden lg:flex flex-col gap-6">

              {/* About card */}
              <div className="bg-white rounded-[20px] p-6">
                <div className="flex gap-[10px] items-start pb-4 border-b border-[#e8e8e8]">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[20px] font-normal text-[#0a2412] tracking-[-0.05em] leading-none">About</h3>
                    <p className="text-[11px] font-light text-[#4b4b4b] mt-[10px] leading-relaxed">
                      {roomData.description ?? `Welcome to ${roomData.name}.`}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-0">
                  <div className="flex items-center py-2 border-b border-[#ebebeb]">
                    <span className="flex-1 text-[13px] text-[#8a877b] flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Members</span>
                    <span className="text-[13px] font-semibold text-[#0a2412]">{memberCount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center py-2 border-b border-[#ebebeb]">
                    <span className="flex-1 text-[13px] text-[#8a877b] flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" /> Posts</span>
                    <span className="text-[13px] font-semibold text-[#0a2412]">{roomData.post_count}</span>
                  </div>
                  <div className="flex items-center py-2">
                    <span className="flex-1 text-[13px] text-[#8a877b]">Visibility</span>
                    <span className="text-[13px] font-semibold text-[#0a2412]">{roomData.is_private ? "Private" : "Public"}</span>
                  </div>
                </div>
                {!isJoined && (
                  <button
                    onClick={toggleJoin}
                    disabled={joining}
                    className="w-full mt-4 h-[34px] rounded-[10px] bg-[#0a2412] text-[#fafaf8] text-[13px] font-medium hover:bg-[#0a2412]/90 disabled:opacity-50 transition-colors"
                  >
                    Join Room
                  </button>
                )}
              </div>

              {/* My Rooms card */}
              {joinedRooms.length > 0 && (
                <div className="bg-white rounded-[20px] p-6">
                  <div className="flex gap-[10px] items-start pb-4 border-b border-[#e8e8e8]">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[20px] font-normal text-[#0a2412] tracking-[-0.05em] leading-none">My Rooms</h3>
                      <p className="text-[11px] font-light text-[#4b4b4b] mt-[10px] leading-relaxed w-[196px]">
                        Your communities at a glance.
                      </p>
                    </div>
                    <Link
                      href="/community"
                      className="w-[44px] h-[44px] bg-[#e8e8e8] rounded-[12px] flex items-center justify-center shrink-0 hover:bg-[#dddbd2] transition-colors"
                    >
                      <ArrowUpRight className="w-[18px] h-[18px] text-[#3d3c36]" />
                    </Link>
                  </div>
                  <div className="mt-4 flex flex-col">
                    {joinedRooms.map((r, i) => (
                      <Link
                        key={r.id}
                        href={`/community/rooms/${r.slug}`}
                        className={`flex items-center py-2 hover:opacity-70 transition-opacity ${
                          i < joinedRooms.length - 1 ? "border-b border-[#ebebeb]" : ""
                        }`}
                      >
                        <span className={`flex-1 text-[14px] truncate ${
                          r.slug === roomData.slug ? "font-semibold text-[#0a2412]" : "text-[#292929]"
                        }`}>
                          {r.name}
                        </span>
                        {r.slug === roomData.slug && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0a2412] shrink-0 ml-2" />
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Manage modal */}
      <ManageRoomModal
        isOpen={manageOpen}
        onClose={() => setManageOpen(false)}
        room={roomData}
        onUpdated={(updated) => setRoomData({ ...roomData, ...updated })}
      />
    </div>
  );
}
