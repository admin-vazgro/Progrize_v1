"use client";

import { useState } from "react";
import { UserPlus, UserCheck, Loader2, Check } from "lucide-react";

export type Relationship = "none" | "pending_sent" | "pending_received" | "connected" | "self";

interface Props {
  targetUserId: string;
  initialRelationship: Relationship;
  initialRequestId?: string;
  initialFollowing?: boolean;
  size?: "sm" | "md";
  onAction?: (action: string, newRelationship: Relationship) => void;
}

export default function ConnectButton({
  targetUserId,
  initialRelationship,
  initialRequestId,
  initialFollowing = false,
  size = "md",
  onAction,
}: Props) {
  const [relationship, setRelationship] = useState<Relationship>(initialRelationship);
  const [requestId, setRequestId] = useState(initialRequestId);
  const [following, setFollowing] = useState(initialFollowing);
  const [connectLoading, setConnectLoading] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const sm = size === "sm";
  const btnBase = sm
    ? "h-[30px] px-[10px] text-[11px] rounded-[8px] flex items-center gap-[5px] transition-colors"
    : "h-[36px] px-[14px] text-[13px] rounded-[10px] flex items-center gap-[6px] transition-colors";

  async function sendRequest() {
    setConnectLoading(true);
    const res = await fetch("/api/connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient_id: targetUserId }),
    });
    const data = await res.json();
    if (res.ok) {
      setRelationship("pending_sent");
      setRequestId(data.request.id);
      onAction?.("request_sent", "pending_sent");
    }
    setConnectLoading(false);
  }

  async function respond(action: "accept" | "reject" | "withdraw" | "remove") {
    if (!requestId) return;
    setConnectLoading(true);
    await fetch(`/api/connections/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const newRel: Relationship = action === "accept" ? "connected" : "none";
    setRelationship(newRel);
    onAction?.(action, newRel);
    setConnectLoading(false);
  }

  async function toggleFollow() {
    setFollowLoading(true);
    const res = await fetch(`/api/users/${targetUserId}/follow`, { method: "POST" });
    const data = await res.json();
    if (res.ok) setFollowing(data.following);
    setFollowLoading(false);
  }

  if (relationship === "self") return null;

  if (relationship === "connected") {
    return (
      <div className="flex gap-2 items-center">
        <span className={`${btnBase} bg-[#e8f2eb] text-[#0a2412] font-medium cursor-default`}>
          <Check className={sm ? "w-[10px] h-[10px]" : "w-[13px] h-[13px]"} />
          Connected
        </span>
        <button
          onClick={toggleFollow}
          disabled={followLoading}
          className={`${btnBase} border ${following ? "border-[#0a2412] text-[#0a2412] bg-[#f0fdf4]" : "border-[#eceae3] text-[#5f5d54] hover:border-[#c0bdb4]"}`}
        >
          {followLoading && <Loader2 className={sm ? "w-[10px] h-[10px] animate-spin" : "w-[12px] h-[12px] animate-spin"} />}
          {following ? "Following" : "Follow"}
        </button>
        <button
          onClick={() => respond("remove")}
          disabled={connectLoading}
          className={`${btnBase} text-[#8a877b] hover:text-red-500 hover:bg-red-50`}
        >
          Remove
        </button>
      </div>
    );
  }

  if (relationship === "pending_sent") {
    return (
      <button
        onClick={() => respond("withdraw")}
        disabled={connectLoading}
        className={`${btnBase} border border-[#eceae3] text-[#8a877b] hover:border-red-300 hover:text-red-500 font-medium`}
      >
        {connectLoading && <Loader2 className={sm ? "w-[10px] h-[10px] animate-spin" : "w-[12px] h-[12px] animate-spin"} />}
        Pending · withdraw
      </button>
    );
  }

  if (relationship === "pending_received") {
    return (
      <div className="flex gap-2">
        <button
          onClick={() => respond("accept")}
          disabled={connectLoading}
          className={`${btnBase} bg-[#0a2412] text-[#fafaf8] font-medium hover:bg-[#0a2412]/90 disabled:opacity-60`}
        >
          {connectLoading
            ? <Loader2 className={sm ? "w-[10px] h-[10px] animate-spin" : "w-[12px] h-[12px] animate-spin"} />
            : <UserCheck className={sm ? "w-[10px] h-[10px]" : "w-[13px] h-[13px]"} />}
          Accept
        </button>
        <button
          onClick={() => respond("reject")}
          disabled={connectLoading}
          className={`${btnBase} border border-[#eceae3] text-[#5f5d54] hover:border-[#c0bdb4]`}
        >
          Reject
        </button>
      </div>
    );
  }

  // none
  return (
    <div className="flex gap-2">
      <button
        onClick={sendRequest}
        disabled={connectLoading}
        className={`${btnBase} bg-[#0a2412] text-[#fafaf8] font-medium hover:bg-[#0a2412]/90 disabled:opacity-60`}
      >
        {connectLoading
          ? <Loader2 className={sm ? "w-[10px] h-[10px] animate-spin" : "w-[12px] h-[12px] animate-spin"} />
          : <UserPlus className={sm ? "w-[10px] h-[10px]" : "w-[13px] h-[13px]"} />}
        Connect
      </button>
      <button
        onClick={toggleFollow}
        disabled={followLoading}
        className={`${btnBase} border ${following ? "border-[#0a2412] text-[#0a2412] bg-[#f0fdf4]" : "border-[#eceae3] text-[#5f5d54] hover:border-[#c0bdb4]"}`}
      >
        {followLoading && <Loader2 className={sm ? "w-[10px] h-[10px] animate-spin" : "w-[12px] h-[12px] animate-spin"} />}
        {following ? "Following" : "Follow"}
      </button>
    </div>
  );
}
