// Draws the launcher faces with real Skia, from the same values the live eye
// is drawn from. The dark nine were exported from a design project and are
// checked in as-is; the LIGHT nine (2026-10-08) have no design of their own,
// so they are rendered here instead, and this file is how to make them again.
//
//   node tools/build-icons.mjs --check   render the DARK set and measure it
//                                        against the shipped PNGs
//   node tools/build-icons.mjs           write the light set into assets/
//
// The check is the reason to trust the light output. A renderer that cannot
// reproduce the nine faces a designer drew has no business drawing nine new
// ones; one that can, drawing from `ART.light` instead of `ART.dark`, is the
// design's own recipe applied to the other finish.
//
// The recipe (assets/ICONS.md): the optic at rest — lids open, no drift, no
// gaze — drawn at 130px on a 2x canvas, so it fills 60% of a 432 square and
// clears every launcher mask; then aperture +10 points, pupil +3 points, seam
// ×1.36 and glow ×1.65, because a launcher icon is read at 48dp and the live
// eye's proportions go muddy that small.
//
// Node strips the TypeScript itself, so `opticArt.ts`, `emotions.ts` and
// `theme.ts` are imported as they are. None of them has a runtime import,
// which is what makes that possible — keep it so.
import CanvasKitInit from 'canvaskit-wasm';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ART } from '../src/shell/opticArt.ts';
import { EMOTIONS } from '../src/vera/emotions.ts';
import { LIGHT, LIGHT_MIX } from '../src/core/theme.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const faces = JSON.parse(readFileSync(join(ROOT, 'src/core/faces.json'), 'utf8'));
const FACES = [faces.dormant, ...faces.order];

const CANVAS = 432;
const DPR = 2;
const SIZE = 130; // the optic in CSS px; ×DPR is 260, 60% of the canvas

// ICONS.md's icon-scale transform.
const icon = (e) => ({
  ...e,
  aperture: e.aperture + 0.1,
  pupil: e.pupil + 0.03,
  glow: e.glow * 1.65,
});

// What ICONS.md does not say, recovered by measuring the shipped nine against
// this renderer (`--check`). Each is the dark set's own decision, so the light
// set inherits it.
const ICON = {
  // ICONS.md's "seam ×1.36" is a STROKE WIDTH, not an alpha: the iris ring
  // (1.5 → 2.04), the lid seam (1 → 1.36) and the engraved rings all measure
  // at 1.36× the live eye's widths, and every seam measures at full `--seam`.
  stroke: 1.36,
  // The socket sits 5px in, not the live eye's 4 — every face's iris and pupil
  // land on the recipe exactly with a 120px socket radius and on nothing else.
  inset: 5,
  // Lids rest at 0.87 of the live eye's height: within 2px on all six lidded
  // faces, which is the seam's own thickness. Unstated in ICONS.md.
  lid: 0.87,
  // The iris ring is a band INSIDE the iris edge, not centred on it.
  ringInside: true,
  // No fibre and no lid grain: both are hairline textures, unreadable at 48dp,
  // and neither appears anywhere in the shipped set. The knurl is the housing
  // rather than texture inside the eye, so the light set keeps it.
  fibre: false,
  grain: false,
  // One engraved ring, the outer. The live eye's second, at 7%, is absent from
  // every shipped face — measured flat to the socket's own ground at its radius.
  rings: 1,
  // The catchlight is placed in the SOCKET's box, as the design's CSS places
  // it. The live eye measures it against its canvas (see Optic.tsx); the
  // shipped set does not.
  catchInSocket: true,
};

// The live eye's own constants, at rest. Where Optic.tsx keeps one, it is
// restated here because that file is TSX and cannot be imported under Node.
// Nothing holds the two together but this note — change one, change both, and
// run `--check` to see the dark set still lands on the shipped one.
const SOCKET_CENTRE_Y = 0.38;
const IRIS_CENTRE = [0.42, 0.36];
const FIBRE_COUNT = 100;
const FIBRE_SLANT_DEG = 0.6;
const FIBRE_GROUP_OPACITY = 0.6;
const INNER_RING_RADIUS = 1 - 2 * 0.22;
const CATCH = { left: 0.25, top: 0.2, w: 0.22, h: 0.15 };
const KNURL = { count: 138, depth: 3.5, alpha: 0.188 };
const BEZEL_SWEEP_START = -70;
const SEAM_B = 0.18;
const GLOW_SPREAD = 30;
// 1f's housing shadow, `0 10px 24px #2a333b38`. The live eye cannot draw it —
// its canvas ends at the bezel — but an icon has 86px of room on every side,
// so here it is the design's own value rather than a departure.
const CAST = { dy: 10, blur: 24, colour: '#2a333b38' };

// The icon background, per ground. The dark one is the shipped PNG; the light
// one mirrors its shape — a radial lift centred a little above the middle,
// falling to the edge colour by the canvas's half-width — onto LIGHT.iconBg,
// which is LIGHT.bg, so the light icon, the light splash and the light stage
// are one ground. The edge is what the launcher shows past the eye.
const BG = {
  dark: { centre: '#191613', edge: '#131011' },
  light: { centre: '#f3f5f6', edge: LIGHT.iconBg },
};
const BG_CENTRE_Y = 0.46;

const hex = (s) => {
  const h = s.replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [0, 2, 4, 6].map((i) => (i < n.length ? parseInt(n.slice(i, i + 2), 16) : 255));
};
const css = ([r, g, b, a = 255]) =>
  `#${[r, g, b, a].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
// color-mix(in srgb, a t, b) — the same channel-wise mix interpolateColor does.
const mix = (base, colour, t) => {
  const [a, b] = [hex(base), hex(colour)];
  return css(a.map((v, i) => v + (b[i] - v) * t));
};
const onLight = (iris) => mix('#000000', iris, LIGHT_MIX);

const CK = await CanvasKitInit();
const col = (s, alpha = 1) => {
  const [r, g, b, a] = hex(s);
  return CK.Color(r, g, b, (a / 255) * alpha);
};

function paint(colour, alpha = 1) {
  const p = new CK.Paint();
  p.setAntiAlias(true);
  if (colour) p.setColor(col(colour, alpha));
  return p;
}

// This CanvasKit builds paths through PathBuilder and hands back an
// immutable Path with `detach()`.
const circlePath = (cx, cy, r) => new CK.PathBuilder().addCircle(cx, cy, r).detach();

// An inset box-shadow on a circle: clip to it, and blur a sheet with a hole
// the circle's size, offset by the shadow's own offset.
function innerShadow(canvas, cx, cy, r, dx, dy, blur, colour) {
  canvas.save();
  canvas.clipPath(circlePath(cx, cy, r), CK.ClipOp.Intersect, true);
  const b = new CK.PathBuilder();
  b.addRect(CK.LTRBRect(cx - r * 3, cy - r * 3, cx + r * 3, cy + r * 3));
  b.addCircle(cx + dx, cy + dy, r);
  b.setFillType(CK.FillType.EvenOdd);
  const sheet = b.detach();
  const p = paint(colour);
  if (blur > 0) p.setMaskFilter(CK.MaskFilter.MakeBlur(CK.BlurStyle.Normal, blur / 2, true));
  canvas.drawPath(sheet, p);
  canvas.restore();
}

function drawBackground(canvas, theme) {
  const { centre, edge } = BG[theme];
  const p = paint();
  p.setShader(CK.Shader.MakeRadialGradient(
    [CANVAS / 2, CANVAS * BG_CENTRE_Y], CANVAS / 2,
    [col(centre), col(edge)], [0, 1], CK.TileMode.Clamp,
  ));
  canvas.drawRect(CK.LTRBRect(0, 0, CANVAS, CANVAS), p);
}

function drawEye(canvas, theme, key) {
  const art = ART[theme];
  const e = icon(EMOTIONS[key]);
  const iris = e.iris;
  const accent = art.darkenAccent ? onLight(iris) : iris;

  canvas.save();
  const o = (CANVAS - SIZE * DPR) / 2;
  canvas.translate(o, o);
  canvas.scale(DPR, DPR);

  const c = SIZE / 2;
  const bezelR = c;
  const socketR = bezelR - ICON.inset;
  const socketD = socketR * 2;
  const socketTop = c - socketR;
  const socketBottom = c + socketR;
  const irisR = socketR * e.aperture;
  const pupilR = irisR * e.pupil;

  // 0. what sits under the housing: the old glow in the dark, 1f's cast shadow
  //    in the light.
  if (theme === 'dark') {
    const r = bezelR + GLOW_SPREAD;
    const p = paint();
    // `transparent 58%` of a box 30px past the bezel ends under the bezel's
    // own edge, so this is all but hidden — which is what the shipped set shows.
    p.setShader(CK.Shader.MakeRadialGradient([c, c], r, [col(iris, e.glow), col(iris, 0)], [0, 0.58], CK.TileMode.Clamp));
    canvas.drawCircle(c, c, r, p);
  } else {
    const p = paint(CAST.colour);
    p.setMaskFilter(CK.MaskFilter.MakeBlur(CK.BlurStyle.Normal, CAST.blur / 2, true));
    canvas.drawCircle(c, c + CAST.dy, bezelR, p);
  }

  // 1. bezel
  const bezel = paint(art.bezel);
  if (art.bezelSweep) {
    bezel.setShader(CK.Shader.MakeSweepGradient(
      c, c, art.bezelSweep.map((s) => col(s)), null, CK.TileMode.Clamp, null, 0,
      BEZEL_SWEEP_START, BEZEL_SWEEP_START + 360,
    ));
  }
  canvas.drawCircle(c, c, bezelR, bezel);
  innerShadow(canvas, c, c, bezelR, 0, 1, 0, art.bezelSheen);
  if (art.knurl) {
    const k = paint(art.knurl, KNURL.alpha);
    k.setStyle(CK.PaintStyle.Stroke);
    k.setStrokeWidth(1);
    const b = new CK.PathBuilder();
    for (let i = 0; i < KNURL.count; i++) {
      const a = (i / KNURL.count) * Math.PI * 2;
      b.moveTo(c + (bezelR - KNURL.depth) * Math.cos(a), c + (bezelR - KNURL.depth) * Math.sin(a));
      b.lineTo(c + bezelR * Math.cos(a), c + bezelR * Math.sin(a));
    }
    canvas.drawPath(b.detach(), k);
  }
  if (art.bezelEdge) {
    // Outside the housing, as the design's `0 0 0 1px` has it. The live eye
    // has to draw this inside; an icon has the room.
    const p = paint(art.bezelEdge);
    p.setStyle(CK.PaintStyle.Stroke);
    p.setStrokeWidth(1);
    canvas.drawCircle(c, c, bezelR + 0.5, p);
  }

  // 2. socket
  const socket = paint();
  socket.setShader(CK.Shader.MakeRadialGradient(
    [c, SIZE * SOCKET_CENTRE_Y], socketR,
    art.socket.map((s) => col(s)), [...art.socketStops], CK.TileMode.Clamp,
  ));
  canvas.drawCircle(c, c, socketR, socket);
  if (art.socketShade) innerShadow(canvas, c, c, socketR, 0, 2, 5, art.socketShade);
  if (art.socketEdge) {
    const p = paint(art.socketEdge);
    p.setStyle(CK.PaintStyle.Stroke);
    p.setStrokeWidth(1);
    canvas.drawCircle(c, c, socketR - 0.5, p);
  }

  // 3. the engraved rings
  art.ringRadii.slice(0, ICON.rings).forEach((f, i) => {
    const p = paint(art.ringInk ?? iris, art.ringAlphas[i]);
    p.setStyle(CK.PaintStyle.Stroke);
    p.setStrokeWidth(ICON.stroke);
    canvas.drawCircle(c, c, socketR * f, p);
  });

  // 4. iris, fibre, rings, core
  const core = mix(art.irisCore.base, iris, art.irisCore.mix);
  const edge = typeof art.irisEdge === 'string' ? art.irisEdge : mix(art.irisEdge.base, iris, art.irisEdge.mix);
  const irisPaint = paint();
  irisPaint.setShader(CK.Shader.MakeRadialGradient(
    [c - irisR * (1 - IRIS_CENTRE[0] * 2), c - irisR * (1 - IRIS_CENTRE[1] * 2)], irisR,
    [col(core), col(edge)], [...art.irisStops], CK.TileMode.Clamp,
  ));
  canvas.drawCircle(c, c, irisR, irisPaint);

  const fibre = paint(accent, art.fibreAlpha * FIBRE_GROUP_OPACITY);
  fibre.setStyle(CK.PaintStyle.Stroke);
  fibre.setStrokeWidth(1);
  const sb = new CK.PathBuilder();
  for (let i = 0; i < FIBRE_COUNT; i++) {
    const a = (i / FIBRE_COUNT) * Math.PI * 2 + (FIBRE_SLANT_DEG * Math.PI) / 180;
    sb.moveTo(c, c);
    sb.lineTo(c + irisR * Math.cos(a), c + irisR * Math.sin(a));
  }
  const spokes = sb.detach();
  if (ICON.fibre) {
    canvas.save();
    canvas.clipPath(circlePath(c, c, irisR), CK.ClipOp.Intersect, true);
    canvas.drawPath(spokes, fibre);
    canvas.restore();
  }

  if (art.innerRing !== null) {
    const p = paint(accent, art.innerRing);
    p.setStyle(CK.PaintStyle.Stroke);
    p.setStrokeWidth(ICON.stroke);
    canvas.drawCircle(c, c, irisR * INNER_RING_RADIUS, p);
  }
  const ring = paint(accent);
  ring.setStyle(CK.PaintStyle.Stroke);
  const ringW = 1.5 * ICON.stroke;
  ring.setStrokeWidth(ringW);
  canvas.drawCircle(c, c, ICON.ringInside ? irisR - ringW / 2 : irisR, ring);

  if (art.pupilGlow !== null) {
    const glow = paint(iris);
    glow.setMaskFilter(CK.MaskFilter.MakeBlur(CK.BlurStyle.Normal, art.pupilGlow, true));
    canvas.drawCircle(c, c, pupilR, glow);
  }
  canvas.drawCircle(c, c, pupilR, paint(art.pupil));
  if (art.pupilGlow === null) innerShadow(canvas, c, c, pupilR, 0, 1, 1, art.pupilSheen);

  // 5. catchlight — none on a dead eye
  if (!e.dead) {
    const box = ICON.catchInSocket ? socketD : SIZE;
    const at = ICON.catchInSocket ? socketTop : 0;
    const [x, y, w, h] = [at + box * CATCH.left, at + box * CATCH.top, box * CATCH.w, box * CATCH.h];
    const p = paint();
    p.setShader(CK.Shader.MakeRadialGradient(
      [x + w / 2, y + h / 2], Math.hypot(w, h) / 2,
      [col(art.catchCore), col('#ffffff00')], [0, art.catchStop], CK.TileMode.Clamp,
    ));
    p.setMaskFilter(CK.MaskFilter.MakeBlur(CK.BlurStyle.Normal, art.catchBlur, true));
    canvas.drawOval(CK.LTRBRect(x, y, x + w, y + h), p);
  }

  // 6. lids, at rest, clipped to the socket
  canvas.save();
  canvas.clipPath(circlePath(c, c, socketR), CK.ClipOp.Intersect, true);
  const left = -SIZE * 0.08;
  const right = SIZE * 1.08;
  const grain = (colour, y0, y1) => {
    if (!ICON.grain) return;
    const p = paint();
    const pitch = art.grainPitch;
    const [start, end] = art.grainAxis === 'x' ? [[left, 0], [left + pitch, 0]] : [[0, 0], [0, pitch]];
    p.setShader(CK.Shader.MakeLinearGradient(
      start, end, [col(colour), col(colour), col('#ffffff00'), col('#ffffff00')],
      [0, 1 / pitch, 1 / pitch, 1], CK.TileMode.Repeat,
    ));
    canvas.drawRect(CK.LTRBRect(left, y0, right, y1), p);
  };
  const ramp = (colours, stops, y0, y1) => {
    const p = paint();
    p.setShader(CK.Shader.MakeLinearGradient(
      [0, y0], [0, y1], colours.map((s) => col(s)), [...stops], CK.TileMode.Clamp,
    ));
    return p;
  };

  const top = socketD * e.lid * ICON.lid;
  if (top > 0) {
    const y1 = socketTop + top;
    const shadow = paint(art.lidShadowColour);
    shadow.setMaskFilter(CK.MaskFilter.MakeBlur(CK.BlurStyle.Normal, art.lidShadowBlur, true));
    canvas.drawRect(CK.LTRBRect(left, socketTop + 2, right, y1 + 2), shadow);
    canvas.drawRect(CK.LTRBRect(left, socketTop, right, y1), ramp(art.lidTop, art.lidTopStops, socketTop, y1));
    grain(art.grainTop, socketTop, y1);
  }
  canvas.drawRect(
    CK.LTRBRect(left, socketTop + top - ICON.stroke, right, socketTop + top),
    paint(accent, art.seamAlpha ?? e.seam),
  );

  const bottom = socketD * e.lidB * ICON.lid;
  if (bottom > 0) {
    const y0 = socketBottom - bottom;
    canvas.drawRect(CK.LTRBRect(left, y0, right, socketBottom), ramp(art.lidBottom, art.lidBottomStops, y0, socketBottom));
    grain(art.grainBottom, y0, socketBottom);
    canvas.drawRect(CK.LTRBRect(left, y0, right, y0 + ICON.stroke), paint(accent, art.seamBAlpha ?? SEAM_B));
  }
  canvas.restore();

  canvas.restore();
}

function render(draw) {
  const surface = CK.MakeSurface(CANVAS, CANVAS);
  const canvas = surface.getCanvas();
  canvas.clear(CK.TRANSPARENT);
  draw(canvas);
  const bytes = surface.makeImageSnapshot().encodeToBytes();
  surface.delete();
  return Buffer.from(bytes);
}

const fileOf = (theme, face) =>
  join(ROOT, 'assets', theme === 'dark'
    ? `icon-fg-${face.toLowerCase()}.png`
    : `icon-fg-light-${face.toLowerCase()}.png`);

if (process.argv.includes('--check')) {
  const out = process.argv[process.argv.indexOf('--check') + 1];
  if (!out || out.startsWith('--')) throw new Error('--check takes a directory to write the renders into');
  for (const face of FACES) {
    writeFileSync(join(out, `render-${face.toLowerCase()}.png`), render((cv) => drawEye(cv, 'dark', face.toLowerCase())));
  }
  writeFileSync(join(out, 'render-bg.png'), render((cv) => drawBackground(cv, 'dark')));
  console.log(`dark set rendered into ${out} — compare against assets/icon-fg-*.png`);
} else {
  for (const face of FACES) {
    writeFileSync(fileOf('light', face), render((cv) => drawEye(cv, 'light', face.toLowerCase())));
  }
  writeFileSync(join(ROOT, 'assets', 'icon-bg-light.png'), render((cv) => drawBackground(cv, 'light')));
  console.log(`light set written: ${FACES.length} faces and icon-bg-light.png`);
}
