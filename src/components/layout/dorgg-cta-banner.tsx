interface DorggCtaBannerProps {
  variant?: "primary" | "compact" | "inline";
  placement: string;
  headline?: string;
  sub?: string;
}

const DEFAULT_HEADLINE = "우리 학교 공식 커뮤니티에서 만나요";
const DEFAULT_SUB = "매주 랭킹 변동 · 전교생 채팅 · 학교 대항전";

export function DorggCtaBanner({
  variant = "primary",
  placement,
  headline = DEFAULT_HEADLINE,
  sub = DEFAULT_SUB,
}: DorggCtaBannerProps) {
  const href = `https://dor.gg/?utm_source=ranking_dorgg&utm_medium=cta&utm_campaign=${encodeURIComponent(placement)}`;

  if (variant === "inline") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
      >
        dor.gg 커뮤니티 가입 →
      </a>
    );
  }

  if (variant === "compact") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="group flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-white/10 bg-gradient-to-r from-blue-500/[0.08] to-purple-500/[0.08] hover:from-blue-500/[0.14] hover:to-purple-500/[0.14] transition-all"
      >
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{headline}</div>
          <div className="text-[11px] text-muted-foreground/70 truncate">{sub}</div>
        </div>
        <span className="shrink-0 text-xs font-bold text-blue-300 group-hover:translate-x-0.5 transition-transform">
          가입 →
        </span>
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="group block overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-blue-600/[0.12] via-purple-600/[0.10] to-pink-600/[0.08] hover:border-white/20 transition-all"
    >
      <div className="px-5 py-4 sm:px-6 sm:py-5 flex items-center gap-4">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/[0.08] flex items-center justify-center text-2xl shrink-0">
          🎮
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm sm:text-base font-bold truncate">{headline}</div>
          <div className="text-xs text-muted-foreground/80 mt-0.5 truncate">{sub}</div>
        </div>
        <div className="shrink-0 bg-white text-black text-xs sm:text-sm font-bold px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg group-hover:scale-105 transition-transform">
          가입하기
        </div>
      </div>
    </a>
  );
}
