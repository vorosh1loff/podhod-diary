const paths = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  back: '<path d="M19 12H5m6 6-6-6 6-6"/>',
  previous: '<path d="m15 5-7 7 7 7"/>',
  next: '<path d="m9 5 7 7-7 7"/>',
  journal: '<rect x="5" y="3" width="15" height="18" rx="2"/><path d="M9 3v18m3-12h4m-4 4h4M3 8h4M3 16h4"/>',
  weights: '<path d="M2 10v4m3-7v10m3-12v14m8-14v14m3-12v10m3-7v4M8 12h8"/>',
  storage: '<rect x="4" y="8" width="16" height="12" rx="2"/><path d="M3 4h18v4H3zm7 8h4"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m-13 5h2m4 0h2"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
  edit: '<path d="m14 6 4 4M4 20l4-.8L20 7.3a1.7 1.7 0 0 0 0-2.4L19.1 4a1.7 1.7 0 0 0-2.4 0L4.8 15.9 4 20Z"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4"/>',
  upload: '<path d="M12 16V4m-5 5 5-5 5 5M4 16v4h16v-4"/>',
  search: '<circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 5 5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>',
};

export function icon(name, size = 22) {
  return `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;
}

const AXIS_Y = 136;
const DISC_THICKNESS = 18;
const DISC_SPACING = 22;

// Every round plate uses the same projection and sits on the same axle.
function roundDisc(front, radius) {
  const back = front - DISC_THICKNESS;
  const oval = radius * 0.37;
  const top = AXIS_Y - radius;
  const bottom = AXIS_Y + radius;
  return `<g class="dumbbell-disc">
    <path d="M${front} ${top}H${back}A${oval} ${radius} 0 0 0 ${back} ${bottom}H${front}Z" class="dumbbell-side"/>
    <path d="M${back + 2} ${top + 3}h${DISC_THICKNESS - 2}" class="dumbbell-highlight"/>
    <ellipse cx="${front}" cy="${AXIS_Y}" rx="${oval}" ry="${radius}" class="dumbbell-face"/>
    <ellipse cx="${front}" cy="${AXIS_Y}" rx="${oval - 3}" ry="${radius - 7}" class="dumbbell-rim"/>
  </g>`;
}

const discRadii = [34, 47, 60];
const leftStack = discRadii.map((radius, index) => roundDisc(101 + index * DISC_SPACING, radius)).join('');
const rightStack = [...discRadii].reverse().map((radius, index) => roundDisc(301 + index * DISC_SPACING, radius)).join('');

export const dumbbellArt = `<svg class="dumbbell-art" viewBox="0 0 440 270" fill="none" aria-hidden="true">
  <defs>
    <pattern id="grip-texture" width="8" height="8" patternUnits="userSpaceOnUse">
      <path d="M-4 8 4 0m0 8 8-8M0 0l8 8" class="dumbbell-knurl"/>
    </pattern>
  </defs>
  <g class="dumbbell-guides">
    <path d="M40 235h362M98 24v196M54 43h118M53 170h26m-13-13v26m304-66h30m-15-15v30"/>
    <path d="M184 239v10m12-10v5m12-5v5m12-5v5m12-5v10m12-10v5m12-5v5m12-5v5m12-5v10m12-10v5m12-5v5m12-5v5m12-5v10"/>
  </g>
  <g transform="rotate(17 225 136)" stroke-linejoin="round">
    ${leftStack}
    <rect x="144" y="124" width="162" height="24" rx="9" class="dumbbell-bar"/>
    <rect x="181" y="123" width="91" height="26" rx="5" class="dumbbell-grip"/>
    <rect x="186" y="126" width="81" height="20" rx="3" fill="url(#grip-texture)"/>
    <path d="M176 128v16m101-16v16" class="dumbbell-collars"/>
    ${rightStack}
    <ellipse cx="345" cy="${AXIS_Y}" rx="4.5" ry="11" class="dumbbell-grip"/>
  </g>
</svg>`;

const commonMuscles = {
  shoulders: 'M34 49Q23 48 19 57L17 68Q25 70 30 64Z',
  forearms: 'M15 96L25 98 19 125 13 135 7 132 10 114Z',
  calves: 'M29 163L47 163 44 185 41 204 34 204 28 184Z',
};
const frontMuscles = {
  chest: 'M34 51L48 54V73Q40 78 29 70Z',
  abs: 'M30 73Q39 80 49 76V112L35 109 31 99Z',
  biceps: 'M18 70Q23 72 29 67L27 88 25 96 15 94 15 82Z',
  quads: 'M32 111L49 116 47 147 43 161 30 158 26 139Z',
};
const backMuscles = {
  back: 'M35 50L49 43V108L35 104 29 78Z',
  triceps: 'M18 70Q23 72 29 67L27 88 25 96 15 94 15 82Z',
  glutes: 'M34 103L49 109V125Q39 133 28 125L29 112Z',
  hamstrings: 'M28 127Q39 135 49 127L47 146 42 160 30 157 26 142Z',
};

export function muscleArt(load) {
  const peak = Math.max(0, ...Object.values(load));
  const figure = (regions, caption) => {
    const half = Object.entries({ ...commonMuscles, ...regions }).map(([key, shape]) => {
      const strength = peak && load[key] ? 0.32 + 0.68 * Math.sqrt(load[key] / peak) : 0;
      return `<path class="muscle-zone${strength ? ' loaded' : ''}" d="${shape}" style="--heat:${strength}"/>`;
    }).join('');
    return `<div><svg viewBox="0 0 100 225" aria-hidden="true">
      <path class="muscle-outline" d="M50 7Q36 7 37 22L40 35 43 39 42 44 34 47Q23 45 17 56L12 81 11 98 5 132 3 146 8 152 14 149 18 136 23 126 27 101 30 100 31 106 25 124 24 141 27 159 26 181 31 204 28 211 22 216 25 221 40 221 44 214 43 205 47 181 49 156 50 147 51 156 53 181 57 205 56 214 60 221 75 221 78 216 72 211 69 204 74 181 73 159 76 141 75 124 69 106 70 100 73 101 77 126 82 136 86 149 92 152 97 146 95 132 89 98 88 81 83 56Q77 45 66 47L58 44 57 39 60 35 63 22Q64 7 50 7Z"/>
      <path class="muscle-outline" d="M41 40Q50 45 59 40"/>
      ${half}<g transform="translate(100 0) scale(-1 1)">${half}</g>
    </svg><span>${caption}</span></div>`;
  };
  return `<div class="muscle-map" aria-hidden="true">${figure(frontMuscles, 'Спереди')}${figure(backMuscles, 'Сзади')}</div>`;
}
