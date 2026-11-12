import { ImageResponse } from "next/og";
import { SITE_HOST } from "./config";

export const ogSize = { width: 1200, height: 630 };

function MarkSvg({ size }: { size: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.23, background: "linear-gradient(135deg,#EF3B98,#D13BD0 50%,#A34DFF)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 100 100">
        <polygon points="34,14 94,14 84,46 24,46" fill="white" />
        <polygon points="21.5,54 51.5,54 40.25,90 10.25,90" fill="white" fillOpacity="0.55" />
      </svg>
    </div>
  );
}

export function ogCard({ title, meta, badge }: { title: string; meta: string; badge?: string }) {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#0B0710", padding: 72, color: "#F7F2FA", fontFamily: "sans-serif", position: "relative" }}>
        <div style={{ position: "absolute", top: -200, right: -150, width: 700, height: 700, borderRadius: 999, background: "radial-gradient(circle, rgba(209,59,208,0.35), rgba(11,7,16,0) 70%)", display: "flex" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <MarkSvg size={64} />
          <span style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1 }}>Pastify</span>
          {badge && (
            <span style={{ marginLeft: "auto", fontSize: 26, color: "#F07CC4", border: "2px solid rgba(239,59,152,0.5)", borderRadius: 999, padding: "6px 22px" }}>{badge}</span>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <span style={{ fontSize: 76, fontWeight: 800, letterSpacing: -2, lineHeight: 1.05, maxWidth: 1050, overflow: "hidden" }}>{title.slice(0, 80)}</span>
          <span style={{ fontSize: 32, color: "#A99BB5" }}>{meta}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 26, color: "#A99BB5", letterSpacing: 4 }}>{SITE_HOST.toUpperCase()}</span>
          <div style={{ width: 360, height: 10, borderRadius: 10, background: "linear-gradient(90deg,#EF3B98,#D13BD0 50%,#A34DFF)", display: "flex" }} />
        </div>
      </div>
    ),
    ogSize,
  );
}
