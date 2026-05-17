export const S = {
  bg: '#F7F9F2', paper: '#FFFFFF', ink: '#18380E', mid: '#536444', dim: '#7E8A68',
  green: '#3D8A22', green2: '#5AAE38', pale: '#E8F4DC', amber: '#E8A84C', amber2: '#C4881C',
  soil: '#A0714F', red: '#E85A3A', blue: '#4A8AB8', dark: '#0D2414', softLine: '#DDE8D2',
  grey: '#D8D8D8', grey2: '#BFBFBF', serif: 'Georgia', sans: 'Aptos', mono: 'Aptos Mono'
};

export const logoPath = "C:\\Users\\Ideal\\Documents\\New project\\terranexaapp-work\\public\\icon-512.png";

export function text(slide, ctx, value, x, y, w, h, opts = {}) {
  return ctx.addText(slide, {
    text: String(value ?? ''), left: x, top: y, width: w, height: h,
    fontSize: opts.size ?? 18, color: opts.color ?? S.ink, bold: Boolean(opts.bold),
    typeface: opts.face ?? (opts.serif ? S.serif : opts.mono ? S.mono : S.sans),
    align: opts.align ?? 'left', valign: opts.valign ?? 'top',
    fill: opts.fill ?? '#00000000', line: opts.line ?? ctx.line(),
    insets: opts.insets ?? { left: 0, right: 0, top: 0, bottom: 0 }, name: opts.name
  });
}

export function shape(slide, ctx, x, y, w, h, fill, opts = {}) {
  return ctx.addShape(slide, {
    left: x, top: y, width: w, height: h, geometry: opts.geometry ?? 'rect',
    fill, line: opts.line ?? ctx.line(opts.stroke ?? '#00000000', opts.weight ?? 0), name: opts.name
  });
}

export function rule(slide, ctx, x, y, w, color = S.green, weight = 2) {
  return shape(slide, ctx, x, y, w, weight, color);
}

export function vRule(slide, ctx, x, y, h, color = S.green, weight = 2) {
  return shape(slide, ctx, x, y, weight, h, color);
}

export function bg(slide, ctx, tone = 'light') {
  shape(slide, ctx, 0, 0, 1280, 720, tone === 'dark' ? S.dark : S.bg);
  if (tone !== 'dark') {
    shape(slide, ctx, 0, 0, 1280, 18, S.pale);
    shape(slide, ctx, 0, 18, 1280, 2, S.amber);
  }
}

export async function brand(slide, ctx, x = 58, y = 38, dark = false) {
  await ctx.addImage(slide, { path: logoPath, left: x, top: y, width: 34, height: 34, fit: 'contain', alt: 'TerraNexa icon' });
  text(slide, ctx, 'TerraNexa', x + 44, y + 1, 160, 24, { serif: true, bold: true, size: 20, color: dark ? '#FFFFFF' : S.green });
  text(slide, ctx, 'ROADMAP DE FOCO', x + 45, y + 29, 190, 14, { mono: true, bold: true, size: 7.4, color: dark ? '#B8D7B0' : S.dim });
}

export async function header(slide, ctx, kicker, title, note = '', opts = {}) {
  bg(slide, ctx, opts.dark ? 'dark' : 'light');
  await brand(slide, ctx, 58, 36, opts.dark);
  text(slide, ctx, kicker.toUpperCase(), 58, 108, 430, 18, { mono: true, bold: true, size: 9, color: opts.dark ? '#A8D98F' : S.dim });
  text(slide, ctx, title, 58, 132, opts.w ?? 780, opts.h ?? 78, { serif: true, bold: true, size: opts.size ?? 31, color: opts.dark ? '#FFFFFF' : S.ink });
  if (note) text(slide, ctx, note, 58, opts.noteY ?? 214, opts.noteW ?? 780, opts.noteH ?? 40, { size: 14, color: opts.dark ? '#DDE8D2' : S.mid });
}

export function footer(slide, ctx, n, label = 'TerraNexa | fases de foco para teste em campo') {
  rule(slide, ctx, 58, 665, 1060, S.softLine, 1);
  text(slide, ctx, label, 58, 678, 650, 18, { size: 8.5, color: S.dim, mono: true, bold: true });
  text(slide, ctx, String(n).padStart(2, '0'), 1160, 674, 54, 24, { size: 13, color: S.green, mono: true, bold: true, align: 'right' });
}

export function pill(slide, ctx, label, x, y, w, fill = S.pale, color = S.ink, opts = {}) {
  shape(slide, ctx, x, y, w, opts.h ?? 30, fill, { line: ctx.line(opts.stroke ?? '#00000000', opts.weight ?? 0) });
  text(slide, ctx, label, x + 10, y + 8, w - 20, 14, { size: opts.size ?? 9.5, color, bold: true, align: 'center', mono: opts.mono });
}

export function card(slide, ctx, x, y, w, h, title, body, accent = S.green, opts = {}) {
  shape(slide, ctx, x, y, w, h, opts.fill ?? S.paper, { line: ctx.line(opts.stroke ?? S.softLine, 1) });
  rule(slide, ctx, x, y, w, accent, 4);
  text(slide, ctx, title, x + 16, y + 18, w - 32, 24, { serif: true, bold: true, size: opts.titleSize ?? 17, color: S.ink });
  text(slide, ctx, body, x + 16, y + 54, w - 32, Math.max(18, h - 68), { size: opts.bodySize ?? 12, color: S.mid });
}

export function mapPanel(slide, ctx, x, y, w, h, opts = {}) {
  shape(slide, ctx, x, y, w, h, S.dark);
  shape(slide, ctx, x + 2, y + 2, w - 4, h - 4, '#173A21');
  for (let i = 0; i < 8; i++) vRule(slide, ctx, x + 18 + i * (w - 36) / 7, y + 12, h - 24, '#315338', 1);
  for (let i = 0; i < 5; i++) rule(slide, ctx, x + 12, y + 24 + i * (h - 48) / 4, w - 24, '#315338', 1);
  const colors = opts.monitor ? ['#3D8A22','#E8A84C','#E85A3A','#8A9070','#3D8A22','#E8A84C'] : ['#5D8C45','#6D9C52','#587F3F','#83A05C','#698E48','#759954'];
  const cells = [[.08,.18,.22,.19,'A01'],[.36,.14,.22,.18,'A03'],[.62,.18,.22,.18,'B01'],[.17,.47,.24,.2,'C02'],[.45,.45,.22,.18,'D04'],[.68,.49,.20,.18,'B06'],[.32,.72,.22,.16,'C07'],[.58,.73,.23,.16,'D09']];
  cells.forEach((c, idx) => {
    const [cx,cy,cw,ch,label] = c;
    shape(slide, ctx, x+cx*w, y+cy*h, cw*w, ch*h, colors[idx%colors.length], { line: ctx.line('#E8F4DC', 1.6) });
    if (opts.labels !== false) text(slide, ctx, label, x+cx*w+cw*w/2-22, y+cy*h+ch*h/2-8, 44, 16, { size: 10, bold: true, color: '#FFFFFF', align: 'center' });
  });
  if (opts.badge !== false) {
    shape(slide, ctx, x + 14, y + h - 40, 92, 24, '#0A1710', { line: ctx.line('#FFFFFF33', 1) });
    text(slide, ctx, opts.badge || 'MAPBOX', x + 24, y + h - 34, 72, 12, { mono: true, bold: true, size: 7.3, color: '#FFFFFF' });
  }
}

export function node(slide, ctx, label, x, y, w = 160, color = S.grey, opts = {}) {
  shape(slide, ctx, x, y, w, opts.h ?? 34, color, { line: ctx.line(opts.stroke ?? '#00000000', 0) });
  rule(slide, ctx, x, y + (opts.h ?? 34) - 3, w, opts.underline ?? '#4B4B4B', 3);
  text(slide, ctx, label, x + 10, y + 8, w - 20, 16, { size: opts.size ?? 11, color: opts.color ?? '#222222', align: 'center' });
}

export function phase(slide, ctx, label, x, y, w, color, opts = {}) {
  shape(slide, ctx, x, y, w, 38, color);
  text(slide, ctx, label, x + 10, y + 10, w - 20, 16, { size: opts.size ?? 11, bold: true, color: '#FFFFFF', align: 'center' });
}

export function connector(slide, ctx, x1, y1, x2, y2, color = '#C8C8C8', weight = 7) {
  const midX = x1 + (x2 - x1) * 0.5;
  rule(slide, ctx, Math.min(x1, midX), y1, Math.abs(midX - x1), color, weight);
  vRule(slide, ctx, midX, Math.min(y1, y2), Math.abs(y2 - y1), color, weight);
  rule(slide, ctx, Math.min(midX, x2), y2, Math.abs(x2 - midX), color, weight);
}

export function checklist(slide, ctx, x, y, items, color = S.green) {
  items.forEach((item, i) => {
    const yy = y + i * 42;
    shape(slide, ctx, x, yy, 18, 18, item.done ? color : '#FFFFFF', { line: ctx.line(item.done ? color : S.softLine, 1) });
    if (item.done) text(slide, ctx, '✓', x + 3, yy - 1, 12, 18, { size: 12, bold: true, color: '#FFFFFF', align: 'center' });
    text(slide, ctx, item.label, x + 30, yy - 1, 310, 20, { size: 13, bold: true, color: S.ink });
    text(slide, ctx, item.note, x + 30, yy + 19, 310, 16, { size: 9.5, color: S.mid });
  });
}

export function metric(slide, ctx, x, y, value, label, color = S.green) {
  rule(slide, ctx, x, y, 3, color, 52);
  text(slide, ctx, value, x + 14, y - 3, 140, 30, { serif: true, bold: true, size: 26, color: S.ink });
  text(slide, ctx, label.toUpperCase(), x + 14, y + 34, 170, 14, { mono: true, bold: true, size: 7.6, color: S.dim });
}
