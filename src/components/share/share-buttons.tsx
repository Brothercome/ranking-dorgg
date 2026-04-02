"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { RankEntry } from "@/types/ranking";
import { shareToKakao, downloadShareImage, copyShareLink, initKakao } from "@/lib/share/kakao";

interface ShareButtonsProps {
  rankEntry: RankEntry;
  shareUrl: string;
}

export function ShareButtons({ rankEntry, shareUrl }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleKakaoShare = () => {
    initKakao();
    shareToKakao(rankEntry, shareUrl);
  };

  const handleInstagramShare = async () => {
    setDownloading(true);
    try {
      await downloadShareImage(rankEntry);
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyLink = async () => {
    const success = await copyShareLink(shareUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-muted-foreground text-center">친구들에게 자랑하기</p>
      <div className="grid grid-cols-2 gap-3">
        {/* KakaoTalk */}
        <Button
          onClick={handleKakaoShare}
          className="bg-[#FEE500] text-[#191919] hover:bg-[#FDD800] font-medium"
        >
          💬 카카오톡
        </Button>

        {/* Instagram Stories */}
        <Button
          onClick={handleInstagramShare}
          disabled={downloading}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium"
        >
          {downloading ? "다운로드 중..." : "📸 인스타 스토리"}
        </Button>

        {/* Discord */}
        <Button
          onClick={handleCopyLink}
          className="bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium"
        >
          🎮 디스코드
        </Button>

        {/* Copy Link */}
        <Button onClick={handleCopyLink} variant="outline" className="font-medium">
          {copied ? "✅ 복사됨!" : "🔗 링크 복사"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground text-center">
        인스타 스토리: 이미지 다운로드 → 스토리에 업로드
      </p>
    </div>
  );
}
