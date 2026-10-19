export const SF_SYMBOLS = {
  'leaf.fill': '<path d="M13.9 2.1C7.6 2.1 3.1 6.3 3.1 11.4c0 1 .2 1.8.4 2.4.7.2 1.4.4 2.2.4 5.1 0 9.2-4.5 9.2-10.7 0-.6-.6-1.2-1-1.4z"/>',
  airplane: '<g transform="rotate(90 8 8)"><path d="M8 .9 9.5 5.6 15.3 9.2v1.4L9.5 9v3.4l1.8 1.4v1.2L8 13.9l-3.3 1.1v-1.2L6.5 12.4V9L.7 10.6V9.2L6.5 5.6z"/></g>',
  'circle.fill': '<circle cx="8" cy="8" r="8"/>',
  'checkmark.circle.fill': '<circle cx="8" cy="8" r="7.4"/><path d="M4.6 8.2l2.4 2.4 4.4-5" fill="none" stroke="#0C0D0F" stroke-width="1.7" stroke-linecap="round"/>',
  'questionmark': '<path d="M5.5 5.9c0-1.5 1-2.5 2.6-2.5s2.5 1 2.5 2.3c0 1-.5 1.7-1.5 2.4-.9.6-1.2 1-1.2 1.9v.3H6.3v-.4c0-1.3.4-2 1.6-2.7.8-.5 1.1-.9 1.1-1.5 0-.7-.5-1.2-1.3-1.2-.8 0-1.3.5-1.3 1.4zM9.3 13.2a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>'
};

export const SYMBOL_FALLBACK =
  '<rect x="0.9" y="0.9" width="14.2" height="14.2" rx="3.5" fill="none" stroke="currentColor" stroke-width="1.4"/>';

export const SYMBOL_NAMES = Object.keys(SF_SYMBOLS);
