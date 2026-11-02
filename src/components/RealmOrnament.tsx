// Decorative motifs drawn just outside the realm ring. Coordinates use a 100-unit avatar centred on 0,0,
// so ornaments sit between radius 52 and 62 and scale with any avatar size. Angles run clockwise from the top;
// 105°–165° stays empty for the realm badge.
type Motif = "leaf" | "cloud" | "bead" | "gem" | "flame" | "spark" | "crown";
type Placement = [Motif, number];

const ring = (motif: Motif, angles: number[]): Placement[] => angles.map((angle) => [motif, angle]);
const beads = (step: number) =>
  Array.from({ length: Math.floor(360 / step) }, (_, i) => i * step).filter((angle) => angle < 100 || angle > 170);

const realms: Placement[][] = [
  [],
  ring("leaf", [-28, 28]),
  ring("leaf", [-28, 28, -92, 92]),
  [...ring("leaf", [-28, 28, -92, 92, -150]), ...ring("bead", [0, -60, 60])],
  ring("cloud", [0]),
  ring("cloud", [-48, 48]),
  [...ring("cloud", [-48, 0, 48]), ...ring("bead", [-92, 92, -140])],
  ring("bead", beads(30)),
  [...ring("bead", [30, 60, -30, -60, 180, -150, -120]), ...ring("gem", [0, -90, 90])],
  [...ring("bead", [-30, 30, -60, 60, -120, 180, -150]), ...ring("gem", [0, -90, 90]), ...ring("spark", [-45, 45])],
  [...ring("flame", [-40, 0, 40]), ...ring("spark", [-90, 90, -140])],
  [...ring("crown", [0]), ...ring("flame", [-36, 36, -72, 72]), ...ring("spark", [-110, 96, 180])],
];

function Shape({ motif }: { motif: Motif }) {
  switch (motif) {
    case "leaf":
      return (
        <g>
          <path d="M0 -2 C5 -6 9 -4 10 -9 C5 -10 1 -7 0 -2Z" className="ornament-fill" />
          <path d="M0 -2 C-5 -6 -9 -4 -10 -9 C-5 -10 -1 -7 0 -2Z" className="ornament-hi" />
          <path d="M0 -2 L0 3" className="ornament-stroke" />
        </g>
      );
    case "cloud":
      return (
        <g className="ornament-fill">
          <circle cx="-5" cy="-1" r="3.4" />
          <circle cx="0" cy="-3.5" r="4.4" />
          <circle cx="5.2" cy="-1" r="3.4" />
          <rect x="-8.4" y="-1" width="16.8" height="3.6" rx="1.8" />
        </g>
      );
    case "bead":
      return <circle r="2.6" className="ornament-hi" />;
    case "gem":
      return <path d="M0 -6 L4 0 L0 6 L-4 0Z" className="ornament-fill" />;
    case "spark":
      return (
        <path d="M0 -4.5 L1.1 -1.1 L4.5 0 L1.1 1.1 L0 4.5 L-1.1 1.1 L-4.5 0 L-1.1 -1.1Z" className="ornament-hi" />
      );
    case "flame":
      return (
        <g>
          <path d="M0 -11 C5 -5 6 1 0 5 C-6 1 -5 -5 0 -11Z" className="ornament-fill" />
          <path d="M0 -5 C2.4 -2 2.8 1 0 3 C-2.8 1 -2.4 -2 0 -5Z" className="ornament-hi" />
        </g>
      );
    case "crown":
      return (
        <g>
          <path d="M-11 4 L-11 -5 L-5.5 0 L0 -9 L5.5 0 L11 -5 L11 4Z" className="ornament-crown" />
          <circle cx="0" cy="-9" r="2" className="ornament-hi" />
          <circle cx="-11" cy="-5" r="1.6" className="ornament-hi" />
          <circle cx="11" cy="-5" r="1.6" className="ornament-hi" />
        </g>
      );
  }
}

const radius: Record<Motif, number> = { leaf: 57, cloud: 57, bead: 56, gem: 57, spark: 58, flame: 58, crown: 60 };

export function RealmOrnament({ realm }: { realm: number }) {
  const placements = realms[realm] ?? [];
  if (!placements.length) return null;
  return (
    <svg className="realm-ornament" viewBox="-66 -66 132 132" aria-hidden="true" focusable="false">
      {placements.map(([motif, angle], index) => (
        <g key={index} transform={`rotate(${angle}) translate(0 ${-radius[motif]})`}>
          <Shape motif={motif} />
        </g>
      ))}
    </svg>
  );
}

export const ornamentPlacements = (realm: number): readonly Placement[] => realms[realm] ?? [];
