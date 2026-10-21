/**
 * The chromagraph six-bar mark as an inline SVG.
 * Bars 1,3,5 sit higher; bars 2,4,6 sit lower (offset ~13% of bar height).
 */

type Props = { size?: number; className?: string };

const COLORS = ['#B90000', '#FA5A00', '#FFB400', '#0778B5', '#6AA637', '#951E86'];
const BAR_W = 8;
const BAR_H = 40;
const GAP = 8;
const OFFSET = Math.round(BAR_H * 0.13); // ~5px
const TOTAL_W = 6 * BAR_W + 5 * GAP;
const TOTAL_H = BAR_H + OFFSET;

export function BarsMark({ size = 28, className }: Props) {
  const scale = size / TOTAL_H;
  const svgW = TOTAL_W * scale;
  const svgH = TOTAL_H * scale;

  return (
    <svg
      width={svgW}
      height={svgH}
      viewBox={`0 0 ${TOTAL_W} ${TOTAL_H}`}
      aria-hidden="true"
      className={className}
    >
      {COLORS.map((color, i) => {
        const x = i * (BAR_W + GAP);
        // odd indices (0-based: 0,2,4) are bars 1,3,5 → higher (y=0)
        // even indices (1,3,5) are bars 2,4,6 → lower (y=OFFSET)
        const y = i % 2 === 0 ? 0 : OFFSET;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={BAR_W}
            height={BAR_H}
            fill={color}
            rx={2}
          />
        );
      })}
    </svg>
  );
}
