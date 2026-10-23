#!/usr/bin/env node
// Steerly brand asset generator.
//
//   npm run brand        (root script: "brand": "node scripts/brand/generate.mjs")
//
// Sources live in scripts/brand/src/:
//   mark.svg       gradient mark on transparent (64x64 viewBox)
//   mark-mono.svg  single-colour mark (currentColor)
//   app-icon.svg   mark on the rounded slate tile (also published as favicon.svg)
// Generated (do not hand-edit): src/lockup.svg + src/lockup-light.svg (wordmark outlined to paths),
// and every PNG/SVG under apps/mobile/assets, apps/web/public, apps/admin/public.
//
// To rebrand: replace the three source SVGs (keep the 64x64 viewBox, content centred) and re-run.
// Output is deterministic, so running it twice yields identical files.

import { Resvg } from '@resvg/resvg-js';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const SRC = join(HERE, 'src');

const BRAND = {
  slate: '#0F172A',
  slateDeep: '#0B1120',
  slateLift: '#1E293B',
  amber: '#F59E0B',
  amberLight: '#FBBF24',
  orange: '#F97316',
  muted: '#94A3B8',
};

// ---------------------------------------------------------------- fonts
// Inter ships with the mobile app (@expo-google-fonts/inter), so it is available locally without a network.
const INTER_DIR = join(ROOT, 'node_modules', '@expo-google-fonts', 'inter');
const INTER_WEIGHTS = ['400Regular', '500Medium', '600SemiBold', '700Bold', '800ExtraBold'];
const fontFiles = INTER_WEIGHTS.map((w) => join(INTER_DIR, w, `Inter_${w}.ttf`)).filter(existsSync);
if (fontFiles.length === 0) {
  console.warn('! Inter not found under node_modules/@expo-google-fonts/inter, falling back to system fonts.');
}
const FONT_OPTS = {
  fontFiles,
  loadSystemFonts: fontFiles.length === 0,
  defaultFontFamily: fontFiles.length ? 'Inter' : 'Segoe UI',
};

// ---------------------------------------------------------------- helpers
const read = (name) => readFileSync(join(SRC, name), 'utf8');

/** Inner markup of an <svg> root, with ids namespaced so several copies can share one document. */
function inner(svg, ns) {
  const body = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  return ns ? body.replace(/steerly-/g, `steerly-${ns}-`) : body;
}

/** Place a 64x64-viewBox source at (x, y) with the given box size. */
function place(svg, { x = 0, y = 0, size, ns, color, viewBox = '0 0 64 64' }) {
  const style = color ? ` color="${color}"` : '';
  return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="${viewBox}" fill="none"${style}>${inner(svg, ns)}</svg>`;
}

function doc(w, h, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none">${body}</svg>`;
}

function render(svg, width, { background, opaque = false } = {}) {
  const r = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    background,
    font: FONT_OPTS,
    shapeRendering: 2, // geometricPrecision
    textRendering: 1, // optimizeLegibility
  });
  const img = r.render();
  return opaque ? encodeRgbPng(img.width, img.height, img.pixels) : img.asPng();
}

// Minimal RGB (no alpha channel) PNG encoder, for icons the stores require to be fully opaque.
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodeRgbPng(w, h, rgba) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0; // filter: none
    for (let x = 0; x < w; x++) {
      const s = (y * w + x) * 4;
      const d = y * (w * 3 + 1) + 1 + x * 3;
      raw[d] = rgba[s];
      raw[d + 1] = rgba[s + 1];
      raw[d + 2] = rgba[s + 2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const written = [];
function write(relPath, data) {
  const abs = join(ROOT, relPath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, data);
  written.push(relPath);
}

/** Read PNG IHDR to double-check dimensions + colour type. */
function pngInfo(buf) {
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), colorType: buf[25] };
}

// ---------------------------------------------------------------- sources
const MARK = read('mark.svg');
const MONO = read('mark-mono.svg');
const TILE = read('app-icon.svg');
// Full-bleed tile (square corners) for stores / iOS / maskable icons where the OS applies its own mask.
// The mark is shrunk a little so it breathes inside the OS mask (and sits in the maskable 80% safe zone).
const TILE_SQUARE = TILE.replace(
  /<rect([^>]*?)rx="[^"]*"([^>]*)\/>([\s\S]*)<\/svg>/,
  (_, a, b, rest) =>
    `<rect${a}rx="0"${b}/><g transform="translate(32 32) scale(0.86) translate(-32 -32)">${rest}</g></svg>`,
);
if (TILE_SQUARE === TILE) throw new Error('app-icon.svg: expected a <rect rx="..."> tile background');

// ---------------------------------------------------------------- wordmark (outlined)
function outlinedWordmark(fill) {
  // Lay the wordmark out at a known size, let resvg shape it, and keep the resulting paths.
  const probe = doc(
    400,
    64,
    `<text x="0" y="43" font-family="Inter" font-weight="800" font-size="31" letter-spacing="-0.9" fill="${fill}">Steerly</text>`,
  );
  const r = new Resvg(probe, { font: FONT_OPTS });
  const box = r.getBBox();
  const usvg = r.toString();
  const paths = inner(usvg).replace(/<defs\/>/, '').trim();
  return { paths, width: box ? box.x + box.width : 132 };
}

function lockup(textFill) {
  const { paths, width } = outlinedWordmark(textFill);
  // Mark content spans x 9.75..54.25 in its 64 box; trim side bearings so the lockup hugs its content.
  const textX = 62;
  const w = Math.ceil(textX + width + 8);
  const body = `${place(MARK, { x: 0, y: 0, size: 64, ns: 'lk' })}<g transform="translate(${textX} 0)">${paths}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="6 6 ${w - 6} 52" width="${w - 6}" height="52" fill="none">${body}</svg>\n`;
}

const LOCKUP_DARK = lockup('#FFFFFF'); // for dark backgrounds
const LOCKUP_LIGHT = lockup(BRAND.slate); // for light backgrounds
write('scripts/brand/src/lockup.svg', LOCKUP_DARK);
write('scripts/brand/src/lockup-light.svg', LOCKUP_LIGHT);

// ---------------------------------------------------------------- mobile (Expo)
const M = 'apps/mobile/assets';

// iOS / store icon: 1024², opaque, OS applies the corner mask.
write(`${M}/icon.png`, render(TILE_SQUARE, 1024, { background: BRAND.slate, opaque: true }));

// Android adaptive icon: 432² layers (108dp @4x). Safe zone = centred 264px circle (66dp).
// The mark's ink spans 44.5/64 of its box; a 345px box puts it at ~240px diameter, inside the safe zone.
const AD = 432;
const AD_BOX = 345;
const AD_OFF = (AD - AD_BOX) / 2;
write(`${M}/android-icon-foreground.png`, render(doc(AD, AD, place(MARK, { x: AD_OFF, y: AD_OFF, size: AD_BOX, ns: 'fg' })), AD));
write(
  `${M}/android-icon-background.png`,
  render(
    doc(
      AD,
      AD,
      `<defs><radialGradient id="bg" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(135 95) rotate(50) scale(350)"><stop stop-color="${BRAND.slateLift}"/><stop offset="1" stop-color="${BRAND.slate}"/></radialGradient></defs><rect width="${AD}" height="${AD}" fill="url(#bg)"/>`,
    ),
    AD,
    { background: BRAND.slate, opaque: true },
  ),
);
write(
  `${M}/android-icon-monochrome.png`,
  render(doc(AD, AD, place(MONO, { x: AD_OFF, y: AD_OFF, size: AD_BOX, color: '#FFFFFF' })), AD),
);

// Splash: rounded tile on transparent, reads on both the light (#FFF8EC) and dark splash backgrounds.
write(`${M}/splash-icon.png`, render(doc(1024, 1024, place(TILE, { x: 112, y: 112, size: 800, ns: 'sp' })), 1024));
write(`${M}/favicon.png`, render(TILE, 48));

// ---------------------------------------------------------------- web + admin
const FAVICON_SVG = TILE.replace(/\s*<!--[\s\S]*?-->/g, '');
for (const app of ['apps/web/public', 'apps/admin/public']) {
  write(`${app}/favicon.svg`, FAVICON_SVG);
  write(`${app}/favicon-32.png`, render(TILE, 32));
  write(`${app}/apple-touch-icon.png`, render(TILE_SQUARE, 180, { background: BRAND.slate, opaque: true }));
  write(`${app}/icon-512.png`, render(TILE_SQUARE, 512, { background: BRAND.slate, opaque: true }));
}

// ---------------------------------------------------------------- Open Graph share image (1200x630)
function ogImage() {
  const W = 1200;
  const H = 630;
  const lock = place(MARK, { x: 70, y: 66, size: 92, ns: 'og' });

  // Stylised phone (right) showing a "today" lesson schedule.
  const rows = [
    ['07:00', 'Aarav S.', 'Reverse parking', BRAND.amber],
    ['08:30', 'Priya K.', 'Hill start', '#38BDF8'],
    ['10:00', 'Rohan M.', 'LL test prep', '#34D399'],
    ['11:30', 'Sneha P.', 'City traffic', '#A78BFA'],
  ];
  const rowSvg = rows
    .map(([t, n, s, c], i) => {
      const y = 262 + i * 66;
      return `<rect x="20" y="${y}" width="248" height="56" rx="14" fill="#162033" stroke="#22304A"/>
        <circle cx="46" cy="${y + 28}" r="13" fill="${c}" fill-opacity="0.18"/>
        <text x="46" y="${y + 33}" text-anchor="middle" font-family="Inter" font-weight="700" font-size="12" fill="${c}">${n[0]}</text>
        <text x="68" y="${y + 24}" font-family="Inter" font-weight="600" font-size="14" fill="#E2E8F0">${n}</text>
        <text x="68" y="${y + 42}" font-family="Inter" font-weight="400" font-size="12" fill="${BRAND.muted}">${s}</text>
        <rect x="204" y="${y + 17}" width="52" height="22" rx="11" fill="${i === 0 ? BRAND.amber : '#1E293B'}"/>
        <text x="230" y="${y + 32}" text-anchor="middle" font-family="Inter" font-weight="600" font-size="11" fill="${i === 0 ? BRAND.slate : '#CBD5E1'}">${t}</text>`;
    })
    .join('');
  const phone = `<g transform="translate(838 58) rotate(7)">
      <rect x="-6" y="-6" width="300" height="620" rx="48" fill="#020617" stroke="#334155" stroke-width="2"/>
      <rect x="4" y="4" width="280" height="600" rx="40" fill="#0B1222"/>
      <rect x="110" y="16" width="68" height="18" rx="9" fill="#020617"/>
      <text x="22" y="72" font-family="Inter" font-weight="500" font-size="13" fill="${BRAND.muted}">Good morning, Coach</text>
      <text x="22" y="100" font-family="Inter" font-weight="800" font-size="24" fill="#F8FAFC">Today</text>
      <rect x="20" y="118" width="248" height="122" rx="18" fill="url(#og-card)"/>
      <text x="38" y="148" font-family="Inter" font-weight="600" font-size="12" fill="${BRAND.slate}" fill-opacity="0.75">Lessons booked</text>
      <text x="38" y="186" font-family="Inter" font-weight="800" font-size="34" fill="${BRAND.slate}">12</text>
      <text x="38" y="216" font-family="Inter" font-weight="600" font-size="12" fill="${BRAND.slate}" fill-opacity="0.75">3 instructors · 2 cars</text>
      ${[34, 52, 40, 64, 48, 72]
        .map((h, i) => `<rect x="${182 + i * 13}" y="${222 - h}" width="9" height="${h}" rx="4.5" fill="${BRAND.slate}" fill-opacity="${i === 5 ? 0.85 : 0.35}"/>`)
        .join('')}
      ${rowSvg}
    </g>`;

  // Fees card floating behind/left of the phone.
  const feeCard = `<g transform="translate(664 448) rotate(-4)">
      <rect x="0" y="10" width="230" height="132" rx="20" fill="#000000" fill-opacity="0.35"/><rect width="230" height="132" rx="20" fill="#111A2E" stroke="#2B3A57" stroke-width="1.5"/>
      <text x="22" y="36" font-family="Inter" font-weight="500" font-size="13" fill="${BRAND.muted}">Fees collected · Oct</text>
      <text x="22" y="74" font-family="Inter" font-weight="800" font-size="28" fill="#F8FAFC">₹1,24,500</text>
      <rect x="22" y="94" width="186" height="8" rx="4" fill="#1E293B"/>
      <rect x="22" y="94" width="140" height="8" rx="4" fill="url(#og-amber)"/>
      <text x="22" y="122" font-family="Inter" font-weight="600" font-size="11" fill="#34D399">+18% vs Sep · UPI</text>
    </g>`;

  const chips = ['Leads CRM', 'Slot booking', 'UPI fees', 'LL / DL tests']
    .reduce(
      (acc, label) => {
        const w = Math.round(label.length * 8.6 + 34);
        acc.svg += `<rect x="${acc.x}" y="470" width="${w}" height="40" rx="20" fill="#FFFFFF" fill-opacity="0.05" stroke="#FFFFFF" stroke-opacity="0.12"/>
          <text x="${acc.x + w / 2}" y="495.5" text-anchor="middle" font-family="Inter" font-weight="600" font-size="15" fill="#E2E8F0">${label}</text>`;
        acc.x += w + 12;
        return acc;
      },
      { x: 80, svg: '' },
    ).svg;

  const body = `
    <defs>
      <linearGradient id="og-bg" x1="0" y1="0" x2="${W}" y2="${H}" gradientUnits="userSpaceOnUse">
        <stop stop-color="${BRAND.slateDeep}"/><stop offset="1" stop-color="${BRAND.slate}"/>
      </linearGradient>
      <radialGradient id="og-glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(960 300) scale(520 420)">
        <stop stop-color="${BRAND.amber}" stop-opacity="0.22"/><stop offset="1" stop-color="${BRAND.amber}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="og-glow2" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(120 40) scale(420 300)">
        <stop stop-color="#38BDF8" stop-opacity="0.08"/><stop offset="1" stop-color="#38BDF8" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="og-fade" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(600 260) scale(760 480)">
        <stop stop-color="#FFFFFF"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
      </radialGradient>
      <mask id="og-gridmask"><rect width="${W}" height="${H}" fill="url(#og-fade)"/></mask>
      <pattern id="og-grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M40 0H0V40" stroke="#FFFFFF" stroke-opacity="0.06" stroke-width="1"/>
      </pattern>
      <linearGradient id="og-amber" x1="0" y1="0" x2="1" y2="0">
        <stop stop-color="${BRAND.amberLight}"/><stop offset="1" stop-color="${BRAND.orange}"/>
      </linearGradient>
      <linearGradient id="og-card" x1="0" y1="0" x2="248" y2="122" gradientUnits="userSpaceOnUse">
        <stop stop-color="${BRAND.amberLight}"/><stop offset="1" stop-color="${BRAND.orange}"/>
      </linearGradient>
      <linearGradient id="og-head" x1="80" y1="0" x2="520" y2="0" gradientUnits="userSpaceOnUse">
        <stop stop-color="${BRAND.amberLight}"/><stop offset="1" stop-color="${BRAND.orange}"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#og-bg)"/>
    <rect width="${W}" height="${H}" fill="url(#og-grid)" mask="url(#og-gridmask)"/>
    <rect width="${W}" height="${H}" fill="url(#og-glow)"/>
    <rect width="${W}" height="${H}" fill="url(#og-glow2)"/>
    ${phone}
    ${feeCard}
    ${lock}
    <text x="166" y="128" font-family="Inter" font-weight="800" font-size="44" letter-spacing="-1.2" fill="#FFFFFF">Steerly</text>
    <text x="80" y="270" font-family="Inter" font-weight="800" font-size="60" letter-spacing="-2" fill="#FFFFFF">Run your driving</text>
    <text x="80" y="340" font-family="Inter" font-weight="800" font-size="60" letter-spacing="-2" fill="#FFFFFF">school on <tspan fill="url(#og-head)">autopilot.</tspan></text>
    <text x="80" y="400" font-family="Inter" font-weight="500" font-size="22" fill="${BRAND.muted}">Leads, bookings, instructors, fees and LL/DL tests —</text>
    <text x="80" y="430" font-family="Inter" font-weight="500" font-size="22" fill="${BRAND.muted}">one app, built for Indian driving schools.</text>
    ${chips}
    <text x="80" y="574" font-family="Inter" font-weight="600" font-size="18" fill="#64748B">steerly.app</text>
  `;
  return doc(W, H, body);
}
write('apps/web/public/og.png', render(ogImage(), 1200, { background: BRAND.slate, opaque: true }));

// ---------------------------------------------------------------- report
for (const rel of written) {
  if (!rel.endsWith('.png')) {
    console.log(`  ${rel}`);
    continue;
  }
  const { w, h, colorType } = pngInfo(readFileSync(join(ROOT, rel)));
  console.log(`  ${rel}  ${w}x${h}${colorType === 6 ? ' rgba' : colorType === 2 ? ' rgb' : ''}`);
}
console.log(`Steerly brand: wrote ${written.length} files (${relative(process.cwd(), ROOT) || '.'}).`);
