"use client";

import { useState } from "react";

interface KoreaMapProps {
  selectedRegion: string;
  onSelectRegion: (region: string) => void;
}

interface RegionData {
  path: string;
  label: string;
  labelX: number;
  labelY: number;
}

const REGIONS: Record<string, RegionData> = {
  "서울특별시": {
    path: "M128,108 L138,104 L144,110 L140,118 L130,117 Z",
    label: "서울", labelX: 136, labelY: 112,
  },
  "인천광역시": {
    path: "M110,106 L125,100 L128,110 L126,120 L112,118 L108,112 Z",
    label: "인천", labelX: 118, labelY: 112,
  },
  "경기도": {
    path: "M100,80 L140,75 L160,85 L165,100 L148,104 L144,100 L138,102 L128,106 L125,98 L110,104 L106,110 L112,120 L126,122 L142,120 L150,108 L168,108 L170,125 L155,140 L125,145 L105,135 L95,115 Z",
    label: "경기", labelX: 138, labelY: 132,
  },
  "강원특별자치도": {
    path: "M160,55 L200,50 L230,65 L240,90 L235,115 L220,135 L195,140 L170,128 L168,108 L150,108 L148,104 L165,100 L160,85 Z",
    label: "강원", labelX: 200, labelY: 95,
  },
  "충청북도": {
    path: "M140,140 L170,128 L195,140 L200,160 L185,178 L160,180 L145,170 L135,155 Z",
    label: "충북", labelX: 168, labelY: 158,
  },
  "세종특별자치시": {
    path: "M120,158 L135,155 L138,165 L130,172 L118,168 Z",
    label: "세종", labelX: 128, labelY: 165,
  },
  "대전광역시": {
    path: "M130,172 L145,170 L148,180 L140,188 L128,184 Z",
    label: "대전", labelX: 138, labelY: 180,
  },
  "충청남도": {
    path: "M75,135 L105,135 L125,145 L140,140 L135,155 L120,158 L118,168 L130,172 L128,184 L140,188 L130,200 L105,205 L80,195 L65,170 L60,150 Z",
    label: "충남", labelX: 95, labelY: 170,
  },
  "전북특별자치도": {
    path: "M80,195 L105,205 L130,200 L140,188 L148,180 L160,180 L165,195 L155,215 L130,225 L95,225 L75,210 Z",
    label: "전북", labelX: 120, labelY: 210,
  },
  "광주광역시": {
    path: "M100,240 L115,235 L120,245 L112,252 L98,248 Z",
    label: "광주", labelX: 110, labelY: 244,
  },
  "전라남도": {
    path: "M60,225 L75,210 L95,225 L130,225 L135,235 L120,245 L115,235 L100,240 L98,248 L112,252 L115,260 L130,265 L125,280 L105,290 L80,285 L55,270 L45,250 L50,235 Z",
    label: "전남", labelX: 90, labelY: 265,
  },
  "경상북도": {
    path: "M185,178 L200,160 L195,140 L220,135 L235,115 L255,125 L265,150 L260,180 L245,200 L225,210 L210,205 L195,210 L180,200 L175,190 Z",
    label: "경북", labelX: 225, labelY: 170,
  },
  "대구광역시": {
    path: "M195,210 L210,205 L218,215 L210,225 L198,222 Z",
    label: "대구", labelX: 207, labelY: 216,
  },
  "경상남도": {
    path: "M130,225 L155,215 L165,195 L160,180 L175,190 L180,200 L195,210 L198,222 L210,225 L218,215 L225,210 L235,220 L230,245 L215,260 L190,265 L165,255 L145,245 L135,235 Z",
    label: "경남", labelX: 180, labelY: 240,
  },
  "울산광역시": {
    path: "M245,200 L260,195 L265,210 L255,218 L245,212 Z",
    label: "울산", labelX: 255, labelY: 207,
  },
  "부산광역시": {
    path: "M215,260 L235,252 L245,260 L240,272 L222,270 Z",
    label: "부산", labelX: 232, labelY: 264,
  },
  "제주특별자치도": {
    path: "M80,340 L130,335 L140,350 L130,365 L80,368 L65,355 Z",
    label: "제주", labelX: 105, labelY: 352,
  },
};

export function KoreaMap({ selectedRegion, onSelectRegion }: KoreaMapProps) {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  return (
    <div className="relative rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-4">
      <h3 className="text-sm font-medium text-muted-foreground mb-2 text-center">지역 선택</h3>
      <svg
        viewBox="40 40 240 340"
        className="w-full h-auto max-h-[420px]"
        style={{ aspectRatio: "240/340" }}
      >
        {Object.entries(REGIONS).map(([name, data]) => {
          const isSelected = name === selectedRegion;
          const isHovered = name === hoveredRegion;

          return (
            <g key={name}>
              <path
                d={data.path}
                fill={isSelected ? "#4a3a8e" : isHovered ? "#2a2a4e" : "#1a1a2e"}
                stroke={isSelected ? "rgba(140,120,255,0.6)" : "rgba(255,255,255,0.1)"}
                strokeWidth={isSelected ? 2 : 1}
                className="cursor-pointer transition-colors duration-150"
                onClick={() => onSelectRegion(name)}
                onMouseEnter={(e) => {
                  setHoveredRegion(name);
                  const svg = e.currentTarget.ownerSVGElement;
                  if (svg) {
                    const pt = svg.createSVGPoint();
                    pt.x = data.labelX;
                    pt.y = data.labelY;
                    const ctm = svg.getScreenCTM();
                    if (ctm) {
                      const screenPt = pt.matrixTransform(ctm);
                      const rect = svg.closest(".relative")?.getBoundingClientRect();
                      if (rect) {
                        setTooltipPos({
                          x: screenPt.x - rect.left,
                          y: screenPt.y - rect.top - 28,
                        });
                      }
                    }
                  }
                }}
                onMouseLeave={() => setHoveredRegion(null)}
              />
              {(isSelected || isHovered) && (
                <text
                  x={data.labelX}
                  y={data.labelY}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="pointer-events-none select-none"
                  fill="white"
                  fontSize="9"
                  fontWeight="600"
                >
                  {data.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoveredRegion && (
        <div
          className="absolute pointer-events-none z-10 px-2.5 py-1 rounded-md bg-black/80 border border-white/10 text-xs text-white whitespace-nowrap"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y,
            transform: "translateX(-50%)",
          }}
        >
          {hoveredRegion}
        </div>
      )}
    </div>
  );
}
