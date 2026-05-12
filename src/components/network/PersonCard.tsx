"use client";

import Link from "next/link";
import ConnectButton, { type Relationship } from "./ConnectButton";

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

interface Props {
  person: Person;
  relationship: Relationship;
  requestId?: string;
}

function Avatar({ name, url, size = 48 }: { name: string | null; url: string | null; size?: number }) {
  const initials = (name ?? "?").split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  if (url) {
    return (
      <img
        src={url}
        alt={name ?? ""}
        style={{ width: size, height: size }}
        className="rounded-full object-cover shrink-0"
      />
    );
  }
  return (
    <div
      className="rounded-full bg-[#0a2412] text-[#c6f46b] flex items-center justify-center font-bold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.3 }}
    >
      {initials}
    </div>
  );
}

export default function PersonCard({ person, relationship, requestId }: Props) {
  return (
    <div className="bg-white rounded-[16px] p-5 flex flex-col gap-4">
      <Link href={`/u/${person.id}`} className="flex gap-3 items-start group">
        <Avatar name={person.full_name} url={person.avatar_url} size={44} />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold text-[#0a2412] truncate group-hover:underline leading-tight">
            {person.full_name ?? "Unknown"}
          </p>
          {person.headline && (
            <p className="text-[12px] text-[#5f5d54] truncate mt-0.5 leading-tight">{person.headline}</p>
          )}
          {person.location && (
            <p className="text-[11px] text-[#8a877b] truncate mt-0.5">{person.location}</p>
          )}
        </div>
      </Link>

      {person.connection_count > 0 && (
        <p className="text-[11px] text-[#8a877b]">
          {person.connection_count} connection{person.connection_count !== 1 ? "s" : ""}
        </p>
      )}

      <ConnectButton
        targetUserId={person.id}
        initialRelationship={relationship}
        initialRequestId={requestId}
        initialFollowing={person.following}
        size="sm"
      />
    </div>
  );
}
