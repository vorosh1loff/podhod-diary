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

export const plateArt = `<svg class="plate-art" viewBox="0 0 440 270" fill="none" aria-hidden="true">
  <defs>
    <pattern id="knurl" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
      <path d="M1 0v6" class="plate-knurl"/>
    </pattern>
  </defs>
  <g class="plate-guides">
    <path d="M2 230h421M295 6v255M154 41h244M183 210 391 22M21 190h60M49 179v22m349-40h30m-15-15v30"/>
    <circle cx="295" cy="135" r="120"/><circle cx="295" cy="135" r="104"/>
  </g>
  <g transform="rotate(-19 290 138)">
    <ellipse cx="266" cy="145" rx="105" ry="93" class="plate-edge"/>
    <ellipse cx="266" cy="145" rx="102" ry="91" fill="url(#knurl)"/>
    <ellipse cx="281" cy="142" rx="106" ry="94" class="plate-mid"/>
    <ellipse cx="296" cy="137" rx="106" ry="94" class="plate-face"/>
    <ellipse cx="296" cy="137" rx="98" ry="86" class="plate-rim"/>
    <ellipse cx="296" cy="137" rx="60" ry="52" class="plate-rim"/>
    <ellipse cx="296" cy="137" rx="53" ry="46" class="plate-seam"/>
    <path d="M249 106Q269 72 299 74M349 172q-16 29-45 30M210 117l24 7m119 24 24 7m-91-95 2 22m17 111 2 22" class="plate-marks"/>
    <ellipse cx="296" cy="137" rx="19" ry="17" class="plate-hole"/>
    <ellipse cx="293" cy="139" rx="13" ry="11" class="plate-core"/>
    <path d="M205 144l-65 16-1 17 17 5 56-14m-73-8 18 6 48-12m-48 12-1 16" class="plate-bar"/>
  </g>
  <g class="plate-guides"><path d="M107 235v12m10-12v6m10-6v6m10-6v6m10-6v12m10-12v6m10-6v6m10-6v6m10-6v12m10-12v6m10-6v6m10-6v6m10-6v12"/></g>
</svg>`;
