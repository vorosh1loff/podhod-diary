const paths = {
  fire: '<path fill="currentColor" stroke="none" d="M13 2c.7 4.6 6.5 6.1 6.5 12.1a7.5 7.5 0 1 1-15 0c0-2.6 1.3-5 3.3-6.7-.1 2 .8 3.1 1.7 3.7C9 7.8 11.8 5.6 13 2Zm-.2 10.2c-1 1.8-3.2 3-3.2 5a2.6 2.6 0 0 0 5.2 0c0-1.9-1.4-2.8-2-5Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  swap: '<path d="M4 8h16m-4-4 4 4-4 4M20 16H4m4-4-4 4 4 4"/>',
  back: '<path d="M19 12H5m6 6-6-6 6-6"/>',
  previous: '<path d="m15 5-7 7 7 7"/>',
  next: '<path d="m9 5 7 7-7 7"/>',
  journal: '<rect x="5" y="3" width="15" height="18" rx="2"/><path d="M9 3v18m3-12h4m-4 4h4M3 8h4M3 16h4"/>',
  weights: '<path d="M2 10v4m3-7v10m3-12v14m8-14v14m3-12v10m3-7v4M8 12h8"/>',
  storage: '<rect x="4" y="8" width="16" height="12" rx="2"/><path d="M3 4h18v4H3zm7 8h4"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m-13 5h2m4 0h2"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  grip: '<path stroke-width="3" d="M8 5h.01m8 0h.01M8 12h.01m8 0h.01M8 19h.01m8 0h.01"/>',
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
