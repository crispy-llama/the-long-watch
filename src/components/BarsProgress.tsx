/**
 * Six-bar progress indicator.
 * Each bar represents ~1/6 of the 250 films and fills from bottom to top.
 */

const COLORS = ['#B90000', '#FA5A00', '#FFB400', '#0778B5', '#6AA637', '#951E86'];

type Props = { seen: number; total: number };

export function BarsProgress({ seen, total }: Props) {
  const sixth = total / 6;

  return (
    <div class="bars-progress" aria-label={`${seen} of ${total} films seen`} role="img">
      {COLORS.map((color, i) => {
        const barStart = i * sixth;
        const barEnd = (i + 1) * sixth;
        // How much of this bar is filled (0–1)
        const fill = Math.min(1, Math.max(0, (seen - barStart) / (barEnd - barStart)));
        return (
          <div key={i} class="bars-progress-bar">
            <div
              class="bars-progress-bar-fill"
              style={{ height: `${fill * 100}%`, background: color }}
            />
          </div>
        );
      })}
    </div>
  );
}
