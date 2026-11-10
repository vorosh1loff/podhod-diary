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

const hexHead = `<path d="M-59-58H-14L10-17-6 39-52 57-82 17Z" class="dumbbell-edge"/>
  <path d="M-59-58h38l-23 75h-38Z" class="dumbbell-side"/>
  <path d="M-82 17h38l30 40h-38Z" class="dumbbell-edge"/>
  <path d="M-21-58H24L48-17 32 39-14 57-44 17Z" class="dumbbell-face"/>
  <path d="M-15-49h34L38-15 25 31-10 46-34 15Z" class="dumbbell-rim"/>
  <path d="M-11-43h26" class="dumbbell-highlight"/>`;

export const dumbbellArt = `<svg class="dumbbell-art" viewBox="0 0 440 270" fill="none" aria-hidden="true">
  <defs>
    <pattern id="grip-texture" width="8" height="8" patternUnits="userSpaceOnUse">
      <path d="M0 4 4 0l4 4-4 4Z" class="dumbbell-knurl"/>
    </pattern>
  </defs>
  <g class="dumbbell-guides">
    <path d="M28 230h393M340 19v218M112 38h302M46 224 422 52M71 69h32m-16-16v32m287 120h34m-17-17v34"/>
    <path d="M144 236v12m10-12v6m10-6v6m10-6v6m10-6v12m10-12v6m10-6v6m10-6v6m10-6v12m10-12v6m10-6v6m10-6v6m10-6v12"/>
  </g>
  <g transform="rotate(-22 253 138)" stroke-linejoin="round">
    <g transform="translate(148 136) scale(.91)">${hexHead}</g>
    <rect x="151" y="123" width="181" height="27" rx="13.5" class="dumbbell-bar"/>
    <rect x="205" y="123" width="84" height="27" rx="5" class="dumbbell-grip"/>
    <rect x="210" y="126" width="74" height="21" rx="3" fill="url(#grip-texture)"/>
    <path d="M200 128v17m94-17v17" class="dumbbell-collars"/>
    <g transform="translate(355 136)">${hexHead}</g>
  </g>
</svg>`;
