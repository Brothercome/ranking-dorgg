"use client";

import Link from "next/link";
import Image from "next/image";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/60 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between px-4 max-w-5xl mx-auto">
        {/* Logo - Home */}
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="도르" width={48} height={48} />
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-6">
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
