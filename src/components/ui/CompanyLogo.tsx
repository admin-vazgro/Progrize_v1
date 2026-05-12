"use client";

import { useState, useEffect } from "react";
import { companyColor } from "@/lib/job-colors";

// Module-level cache — survives re-renders, cleared on page reload
const cache = new Map<string, string | null>();

interface Props {
  name: string;
  size?: number;
  rounded?: number;
  fontSize?: number;
  padding?: number;
}

export default function CompanyLogo({ name, size = 41, rounded = 10, fontSize, padding = 8 }: Props) {
  const cached = cache.get(name);
  const [logoUrl, setLogoUrl] = useState<string | null>(cached !== undefined ? cached : null);
  const [fetched, setFetched] = useState(cached !== undefined);

  useEffect(() => {
    if (cache.has(name)) {
      setLogoUrl(cache.get(name) ?? null);
      setFetched(true);
      return;
    }
    fetch(
      `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(name)}&limit=1`
    )
      .then((r) => r.json())
      .then((data: Array<{ logo?: string }>) => {
        const url = data[0]?.logo ?? null;
        cache.set(name, url);
        setLogoUrl(url);
      })
      .catch(() => {
        cache.set(name, null);
      })
      .finally(() => setFetched(true));
  }, [name]);

  const initials = name.slice(0, 2).toUpperCase();
  const bg = companyColor(name);
  const fs = fontSize ?? Math.round(size * 0.33);

  if (fetched && logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name}
        width={size}
        height={size}
        className="object-contain bg-white border border-[#eceae3] shrink-0"
        style={{ width: size, height: size, borderRadius: rounded, padding }}
        onError={() => {
          cache.set(name, null);
          setLogoUrl(null);
        }}
      />
    );
  }

  return (
    <div
      className="flex items-center justify-center text-white font-bold shrink-0"
      style={{ width: size, height: size, borderRadius: rounded, backgroundColor: bg, fontSize: fs }}
    >
      {!fetched ? null : initials}
    </div>
  );
}
