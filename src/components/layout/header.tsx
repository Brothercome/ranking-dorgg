"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";

function HeaderSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = useCallback(() => {
    const q = query.trim();
    if (!q) return;
    const hasHash = q.includes("#");
    const name = hasHash ? q.split("#")[0].trim() : q;
    const tag = hasHash ? q.split("#")[1]?.trim() || "kr1" : "kr1";
    if (name) {
      router.push(`/player/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`);
      setQuery("");
      setOpen(false);
      inputRef.current?.blur();
    }
  }, [query, router]);

  // Close on route change
  const pathname = usePathname();
  useEffect(() => { setOpen(false); setQuery(""); }, [pathname]);

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0); }}
        className={`flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-muted-foreground/50 hover:border-white/20 transition-colors ${open ? "hidden" : ""}`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
        </svg>
        <span className="hidden sm:inline">검색</span>
      </button>

      {open && (
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") { setOpen(false); setQuery(""); }
            }}
            onBlur={() => { if (!query) setOpen(false); }}
            placeholder="닉네임#태그"
            className="w-36 sm:w-48 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm outline-none placeholder:text-muted-foreground/40 focus:border-white/20"
          />
        </div>
      )}
    </div>
  );
}

export function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/60 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-4 max-w-5xl mx-auto">
        {/* Logo - Home */}
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="도르" width={80} height={80} />
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-6">
          {!isHome && <HeaderSearch />}
          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            랭킹
          </Link>
          <a
            href="https://dor.gg"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            커뮤니티
          </a>
        </nav>
      </div>
    </header>
  );
}
