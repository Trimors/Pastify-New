/** Small dependency-free SVG charts that render on the server. */

export function AreaChart({ data, height = 220, format = (n: number) => String(n) }: { data: { label: string; value: number }[]; height?: number; format?: (n: number) => string }) {
  const W = 800;
  const H = height;
  const pad = { t: 16, r: 8, b: 26, l: 8 };
  const max = Math.max(1, ...data.map((d) => d.value));
  const n = Math.max(1, data.length - 1);
  const x = (i: number) => pad.l + (i / n) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const pts = data.map((d, i) => `${x(i).toFixed(1)},${y(d.value).toFixed(1)}`);
  const line = `M${pts.join(" L")}`;
  const area = `${line} L${x(data.length - 1)},${H - pad.b} L${x(0)},${H - pad.b} Z`;
  const ticks = data.length > 1 ? [0, Math.floor((data.length - 1) / 2), data.length - 1] : [0];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Chart">
      <defs>
        <linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#D13BD0" stopOpacity="0.35" />
          <stop offset="1" stopColor="#D13BD0" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="area-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#EF3B98" />
          <stop offset="0.5" stopColor="#D13BD0" />
          <stop offset="1" stopColor="#A34DFF" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1={pad.l} x2={W - pad.r} y1={y(max * f)} y2={y(max * f)} stroke="#2A1F33" strokeDasharray="3 5" />
      ))}
      <text x={W - pad.r} y={y(max) - 4} textAnchor="end" fontSize="11" fill="#A99BB5">{format(max)}</text>
      {data.length > 1 && <path d={area} fill="url(#area-fill)" />}
      {data.length > 1 && <path d={line} fill="none" stroke="url(#area-line)" strokeWidth="2.5" strokeLinejoin="round" />}
      {data.map((d, i) => (
        <circle key={i} cx={x(i)} cy={y(d.value)} r={data.length <= 31 ? 2.5 : 0} fill="#F07CC4">
          <title>{`${d.label}: ${format(d.value)}`}</title>
        </circle>
      ))}
      {ticks.map((i) => (
        <text key={i} x={x(i)} y={H - 6} fontSize="11" fill="#A99BB5" textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"}>
          {data[i]?.label}
        </text>
      ))}
    </svg>
  );
}

export function Sparkline({ values, width = 96, height = 28 }: { values: number[]; width?: number; height?: number }) {
  const max = Math.max(1, ...values);
  const n = Math.max(1, values.length - 1);
  const pts = values.map((v, i) => `${((i / n) * width).toFixed(1)},${(height - 2 - (v / max) * (height - 4)).toFixed(1)}`).join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <polyline points={pts} fill="none" stroke="#D13BD0" strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  );
}

export function BarList({ rows, format = (n: number) => n.toLocaleString() }: { rows: { label: React.ReactNode; value: number; extra?: React.ReactNode }[]; format?: (n: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="py-6 text-center text-sm text-muted">No data yet.</p>;
  return (
    <ul className="space-y-1.5">
      {rows.map((r, i) => (
        <li key={i} className="relative flex items-center justify-between gap-3 overflow-hidden rounded-md px-2.5 py-1.5 text-sm">
          <span className="absolute inset-y-0 left-0 rounded-md bg-magenta/12" style={{ width: `${(r.value / max) * 100}%` }} />
          <span className="relative truncate">{r.label}</span>
          <span className="relative shrink-0 font-mono text-xs text-muted">
            {r.extra}
            {format(r.value)}
          </span>
        </li>
      ))}
    </ul>
  );
}
