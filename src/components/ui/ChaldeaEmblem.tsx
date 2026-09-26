// The Chaldea emblem, as on the walls of Chaldea's corridors: a laurel wreath opening to the right from a small
// orb, around a ring holding a "C" with a wave sweeping out of it. Drawn in currentColor so it follows the theme.

const CX = 56;
const CY = 50;
const WREATH = 38;
const LEAF = "M0 0C4-4 11-4.4 16 0C11 4.4 4 4 0 0Z";

const rad = (deg: number) => (deg * Math.PI) / 180;
const at = (deg: number, r: number) => [CX + r * Math.cos(rad(deg)), CY - r * Math.sin(rad(deg))] as const;
const round = (n: number) => Math.round(n * 100) / 100;

// Leaves along both branches, pointing toward each branch's tip and leaning outward, clear of the ring.
const LEAVES = [166, 146, 126, 106, 86, 66, 50].flatMap((deg, i) => {
  const tilt = i % 2 ? 24 : 48;
  const leaf = (angle: number, sign: 1 | -1) => {
    const [x, y] = at(sign === 1 ? angle : -angle, WREATH);
    // Direction of travel along the arc toward the tip, as an SVG rotation.
    const a = sign === 1 ? rad(angle) : rad(-angle);
    const dir = (Math.atan2(sign * Math.cos(a), sign * Math.sin(a)) * 180) / Math.PI;
    return `translate(${round(x)} ${round(y)}) rotate(${round(dir - sign * tilt)})`;
  };
  return [leaf(deg, 1), leaf(deg, -1)];
});

// The "C": a thick crescent from its top end round the left, whose lower end runs on into a long wave that
// tapers out past the ring on the right.
function cWithWave(): string {
  const outer = 14.5;
  const inner = 9.5;
  const [ox1, oy1] = at(35, outer);
  const [ox2, oy2] = at(250, outer);
  const [ix2, iy2] = at(250, inner);
  const [ix1, iy1] = at(35, inner);
  const p = (n: number) => round(n);
  return [
    `M${p(ox1)} ${p(oy1)}`,
    `A${outer} ${outer} 0 1 0 ${p(ox2)} ${p(oy2)}`,
    `C62 69 77 65 86 54`,
    `C76 61 63 62 ${p(ix2)} ${p(iy2)}`,
    `A${inner} ${inner} 0 1 1 ${p(ix1)} ${p(iy1)}Z`,
  ].join("");
}

const [tipUpX, tipUpY] = at(45, WREATH);
const [tipDownX, tipDownY] = at(-45, WREATH);

export function ChaldeaEmblem({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 -2 104 104" className={className} aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeLinecap="round">
        <path strokeWidth="2.2" d={`M20 50A${WREATH} ${WREATH} 0 0 1 ${round(tipUpX)} ${round(tipUpY)}`} />
        <path strokeWidth="2.2" d={`M20 50A${WREATH} ${WREATH} 0 0 0 ${round(tipDownX)} ${round(tipDownY)}`} />
        <circle cx={CX} cy={CY} r="21" strokeWidth="3" />
      </g>
      <g fill="currentColor">
        <circle cx="17.5" cy="50" r="3.6" />
        {LEAVES.map((t) => (
          <path key={t} d={LEAF} transform={t} />
        ))}
        <path d={cWithWave()} />
      </g>
    </svg>
  );
}
