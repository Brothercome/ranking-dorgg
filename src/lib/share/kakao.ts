import type { RankEntry } from "@/types/ranking";

declare global {
  interface Window {
    Kakao?: {
      init: (key: string) => void;
      isInitialized: () => boolean;
      Share: {
        sendDefault: (options: Record<string, unknown>) => void;
      };
    };
  }
}

export function initKakao() {
  if (typeof window === "undefined") return;
  if (window.Kakao?.isInitialized()) return;

  const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
  if (key && window.Kakao) {
    window.Kakao.init(key);
  }
}

export function shareToKakao(entry: RankEntry, shareUrl: string) {
  if (!window.Kakao?.isInitialized()) {
    initKakao();
  }

  const baseUrl = process.env.NEXT_PUBLIC_URL ?? "https://ranking-dorgg.vercel.app";
  const ogImageUrl = `${baseUrl}/api/og/share?name=${encodeURIComponent(entry.gameName)}&tier=${encodeURIComponent(entry.tier)}&rank=${entry.rank}&total=${entry.totalParticipants}&school=${encodeURIComponent(entry.organizationName)}&game=${entry.gameType}&tierRank=${encodeURIComponent(entry.tierRank)}`;

  window.Kakao?.Share.sendDefault({
    objectType: "feed",
    content: {
      title: `${entry.organizationName}에서 ${entry.rank}등! 🎮`,
      description: `${entry.gameName} | ${entry.tier} ${entry.tierRank} | ${entry.totalParticipants}명 중 ${entry.rank}등`,
      imageUrl: ogImageUrl,
      link: {
        mobileWebUrl: shareUrl,
        webUrl: shareUrl,
      },
    },
    buttons: [
      {
        title: "나도 랭킹 확인하기",
        link: {
          mobileWebUrl: baseUrl,
          webUrl: baseUrl,
        },
      },
    ],
  });
}

export function getShareImageUrl(entry: RankEntry): string {
  const baseUrl = process.env.NEXT_PUBLIC_URL ?? "https://ranking-dorgg.vercel.app";
  return `${baseUrl}/api/share/image?name=${encodeURIComponent(entry.gameName)}&tier=${encodeURIComponent(entry.tier)}&tierRank=${encodeURIComponent(entry.tierRank)}&rank=${entry.rank}&total=${entry.totalParticipants}&school=${encodeURIComponent(entry.organizationName)}&game=${entry.gameType}&points=${entry.points}`;
}

export async function downloadShareImage(entry: RankEntry): Promise<void> {
  const url = getShareImageUrl(entry);
  const res = await fetch(url);
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = `ranking-dorgg-${entry.gameName}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}

export async function copyShareLink(shareUrl: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(shareUrl);
    return true;
  } catch {
    return false;
  }
}
