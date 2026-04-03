"use client";

import { useState } from "react";

interface KoreaMapProps {
  selectedRegion: string;
  onSelectRegion: (region: string) => void;
}

// Simplified but geographically accurate SVG paths for South Korea's 17 regions
// Viewbox: 0 0 800 1000, oriented with north at top
const REGIONS: Record<string, { d: string; cx: number; cy: number; label: string }> = {
  "서울특별시": {
    d: "M310,270 L325,262 L340,268 L342,280 L330,288 L315,285 Z",
    cx: 326, cy: 276, label: "서울",
  },
  "인천광역시": {
    d: "M270,268 L290,258 L310,270 L315,285 L300,295 L275,290 L265,278 Z",
    cx: 290, cy: 278, label: "인천",
  },
  "경기도": {
    d: "M280,210 L320,195 L370,200 L390,220 L395,250 L380,270 L365,290 L350,310 L330,320 L300,325 L275,310 L260,295 L265,278 L270,268 L290,258 L310,270 L325,262 L340,268 L342,280 L330,288 L315,285 L300,295 L275,290 L260,270 L255,245 L265,220 Z",
    cx: 330, cy: 260, label: "경기",
  },
  "강원특별자치도": {
    d: "M370,200 L420,170 L490,160 L540,180 L560,210 L550,260 L530,310 L500,340 L460,350 L420,340 L395,310 L380,270 L395,250 L390,220 Z",
    cx: 470, cy: 260, label: "강원",
  },
  "충청북도": {
    d: "M350,310 L395,310 L420,340 L430,380 L420,420 L390,430 L360,420 L340,400 L330,370 L325,340 L330,320 Z",
    cx: 375, cy: 370, label: "충북",
  },
  "충청남도": {
    d: "M240,340 L275,310 L300,325 L330,320 L325,340 L330,370 L340,400 L320,420 L290,430 L260,420 L230,400 L220,370 Z",
    cx: 280, cy: 375, label: "충남",
  },
  "세종특별자치시": {
    d: "M320,345 L335,340 L340,355 L330,365 L318,358 Z",
    cx: 330, cy: 352, label: "세종",
  },
  "대전광역시": {
    d: "M335,395 L355,388 L365,400 L358,415 L340,418 L330,408 Z",
    cx: 348, cy: 404, label: "대전",
  },
  "전북특별자치도": {
    d: "M230,430 L260,420 L290,430 L320,420 L340,445 L335,480 L310,510 L275,520 L240,505 L215,480 L210,450 Z",
    cx: 278, cy: 470, label: "전북",
  },
  "광주광역시": {
    d: "M260,545 L278,538 L288,550 L282,565 L265,565 L255,555 Z",
    cx: 272, cy: 553, label: "광주",
  },
  "전라남도": {
    d: "M200,510 L240,505 L275,520 L310,510 L320,540 L310,580 L290,610 L260,640 L230,660 L190,650 L160,620 L155,580 L165,545 L180,520 Z",
    cx: 240, cy: 580, label: "전남",
  },
  "경상북도": {
    d: "M420,340 L460,350 L500,340 L540,360 L570,390 L580,430 L575,470 L555,500 L520,510 L490,500 L460,480 L440,460 L420,420 L430,380 Z",
    cx: 500, cy: 420, label: "경북",
  },
  "대구광역시": {
    d: "M475,460 L498,452 L510,468 L502,485 L482,488 L470,475 Z",
    cx: 490, cy: 472, label: "대구",
  },
  "경상남도": {
    d: "M340,445 L390,430 L420,420 L440,460 L460,480 L490,500 L520,510 L530,545 L510,580 L480,600 L440,610 L400,600 L370,570 L345,530 L335,480 Z",
    cx: 440, cy: 530, label: "경남",
  },
  "울산광역시": {
    d: "M545,490 L570,480 L585,495 L580,515 L560,520 L542,510 Z",
    cx: 562, cy: 502, label: "울산",
  },
  "부산광역시": {
    d: "M510,570 L535,558 L555,570 L550,592 L530,600 L510,590 Z",
    cx: 532, cy: 578, label: "부산",
  },
  "제주특별자치도": {
    d: "M230,780 L280,770 L330,775 L350,795 L340,820 L300,835 L250,830 L220,810 L215,795 Z",
    cx: 285, cy: 800, label: "제주",
  },
};

export function KoreaMap({ selectedRegion, onSelectRegion }: KoreaMapProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="relative bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-4">
      <svg
        viewBox="130 140 500 720"
        className="w-full h-auto"
        style={{ maxHeight: "500px" }}
      >
        {/* Background glow for selected */}
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {Object.entries(REGIONS).map(([name, region]) => {
          const isSelected = name === selectedRegion;
          const isHovered = name === hovered;

          return (
            <g key={name}>
              <path
                d={region.d}
                fill={isSelected ? "#6d5cae" : isHovered ? "#3a3a5e" : "#1e1e32"}
                stroke={isSelected ? "#a78bfa" : isHovered ? "#666" : "rgba(255,255,255,0.12)"}
                strokeWidth={isSelected ? 2 : 1}
                className="cursor-pointer transition-all duration-200"
                filter={isSelected ? "url(#glow)" : undefined}
                onClick={() => onSelectRegion(name)}
                onMouseEnter={() => setHovered(name)}
                onMouseLeave={() => setHovered(null)}
              />
              {/* Label */}
              <text
                x={region.cx}
                y={region.cy}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={name === "세종특별자치시" || name === "서울특별시" ? 9 : 12}
                fill={isSelected ? "#fff" : isHovered ? "#ddd" : "rgba(255,255,255,0.4)"}
                className="pointer-events-none select-none font-medium"
              >
                {region.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hovered && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/80 backdrop-blur-sm border border-white/20 rounded-lg text-xs text-white whitespace-nowrap z-10">
          {hovered}
        </div>
      )}
    </div>
  );
}
