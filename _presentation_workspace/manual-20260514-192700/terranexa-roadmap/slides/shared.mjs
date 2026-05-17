
export const S = {
  bg: '#F7F9F2', paper: '#FFFFFF', ink: '#18380E', mid: '#536444', dim: '#7E8A68',
  green: '#3D8A22', green2: '#5AAE38', pale: '#E8F4DC', amber: '#E8A84C', amber2: '#C4881C',
  soil: '#A0714F', red: '#E85A3A', blue: '#4A8AB8', dark: '#0D2414', softLine: '#DDE8D2',
  serif: 'Georgia', sans: 'Aptos', mono: 'Aptos Mono'
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
export function rect(slide, ctx, x, y, w, h, fill, opts = {}) {
  return ctx.addShape(slide, { left: x, top: y, width: w, height: h, geometry: opts.geometry ?? 'rect', fill, line: opts.line ?? ctx.line(opts.stroke ?? '#00000000', opts.weight ?? 0), name: opts.name });
}
export function strokeRect(slide, ctx, x, y, w, h, stroke = S.softLine, weight = 1, fill = '#00000000') {
  return rect(slide, ctx, x, y, w, h, fill, { line: ctx.line(stroke, weight) });
}
export function rule(slide, ctx, x, y, w, color = S.green, weight = 2) { return rect(slide, ctx, x, y, w, weight, color); }
export function bg(slide, ctx, tone = 'light') {
  rect(slide, ctx, 0, 0, 1280, 720, tone === 'dark' ? S.dark : S.bg);
  if (tone !== 'dark') {
    rect(slide, ctx, 0, 0, 1280, 18, S.pale);
    rect(slide, ctx, 0, 18, 1280, 2, S.amber);
  }
}
export async function brand(slide, ctx, x = 58, y = 42, dark = false) {
  await ctx.addImage(slide, { path: logoPath, left: x, top: y, width: 38, height: 38, fit: 'contain', alt: 'TerraNexa icon' });
  text(slide, ctx, 'TerraNexa', x + 48, y + 2, 160, 24, { serif: true, bold: true, size: 21, color: dark ? '#FFFFFF' : S.green });
  text(slide, ctx, 'PROJETO APP AGRICOLA', x + 49, y + 32, 190, 14, { mono: true, bold: true, size: 7.5, color: dark ? '#B8D7B0' : S.dim });
}
export async function header(slide, ctx, kicker, title, note = '', opts = {}) {
  bg(slide, ctx, opts.dark ? 'dark' : 'light');
  await brand(slide, ctx, 58, 36, opts.dark);
  text(slide, ctx, kicker.toUpperCase(), 58, 108, 380, 18, { mono: true, bold: true, size: 9, color: opts.dark ? '#A8D98F' : S.dim });
  text(slide, ctx, title, 58, 132, opts.w ?? 760, opts.h ?? 78, { serif: true, bold: true, size: opts.size ?? 32, color: opts.dark ? '#FFFFFF' : S.ink });
  if (note) text(slide, ctx, note, 58, 216, opts.noteW ?? 780, 44, { size: 14, color: opts.dark ? '#DDE8D2' : S.mid });
}
export function footer(slide, ctx, n, label = 'Plano executivo do projeto TerraNexa') {
  rule(slide, ctx, 58, 665, 1060, S.softLine, 1);
  text(slide, ctx, label, 58, 678, 620, 18, { size: 8.5, color: S.dim, mono: true, bold: true });
  text(slide, ctx, String(n).padStart(2, '0'), 1160, 674, 54, 24, { size: 13, color: S.green, mono: true, bold: true, align: 'right' });
}
export function pill(slide, ctx, label, x, y, w, fill = S.pale, color = S.ink) {
  rect(slide, ctx, x, y, w, 30, fill);
  text(slide, ctx, label, x + 12, y + 7, w - 24, 16, { size: 10, color, bold: true, align: 'center' });
}
export function kpi(slide, ctx, x, y, value, label, note, color = S.green) {
  rule(slide, ctx, x, y, 3, color, 58);
  text(slide, ctx, value, x + 14, y - 2, 160, 34, { serif: true, bold: true, size: 28, color: S.ink });
  text(slide, ctx, label.toUpperCase(), x + 14, y + 39, 170, 14, { mono: true, bold: true, size: 8, color: S.dim });
  text(slide, ctx, note, x + 14, y + 57, 190, 34, { size: 10, color: S.mid });
}
export function card(slide, ctx, x, y, w, h, title, body, accent = S.green, opts = {}) {
  rect(slide, ctx, x, y, w, h, opts.fill ?? S.paper, { line: ctx.line(opts.stroke ?? S.softLine, 1) });
  rule(slide, ctx, x, y, w, accent, 4);
  text(slide, ctx, title, x + 16, y + 18, w - 32, 24, { serif: true, bold: true, size: opts.titleSize ?? 17, color: S.ink });
  text(slide, ctx, body, x + 16, y + 54, w - 32, Math.max(28, h - 70), { size: opts.bodySize ?? 12, color: S.mid });
}
export function stage(slide, ctx, x, y, w, label, title, note, color, status = '') {
  rect(slide, ctx, x, y, w, 140, '#FFFFFF', { line: ctx.line(S.softLine, 1) });
  rect(slide, ctx, x, y, w, 8, color);
  text(slide, ctx, label, x + 14, y + 20, status ? w - 116 : w - 28, 14, { mono: true, bold: true, size: 8, color: S.dim });
  text(slide, ctx, title, x + 14, y + 42, w - 28, 25, { serif: true, bold: true, size: 16, color: S.ink });
  text(slide, ctx, note, x + 14, y + 76, w - 28, 44, { size: 9.5, color: S.mid });
  if (status) pill(slide, ctx, status, x + w - 92, y + 16, 72, S.pale, S.green);
}
export function drawMap(slide, ctx, x, y, w, h, opts = {}) {
  rect(slide, ctx, x, y, w, h, S.dark);
  rect(slide, ctx, x, y, w, h, '#173A21');
  for (let i = 0; i < 9; i++) rect(slide, ctx, x + 18 + i * (w - 36) / 8, y + 8, 1, h - 16, '#315338');
  for (let i = 0; i < 6; i++) rule(slide, ctx, x + 8, y + 20 + i * (h - 40) / 5, w - 16, '#315338', 1);
  const colors = opts.monitor ? ['#3D8A22','#E8A84C','#E85A3A','#8A9070','#3D8A22','#E8A84C'] : ['#5D8C45','#6D9C52','#587F3F','#83A05C','#698E48','#759954'];
  const cells = [[.08,.15,.22,.18,'A01'],[.34,.12,.24,.2,'A03'],[.62,.16,.24,.18,'B01'],[.16,.44,.24,.22,'C02'],[.46,.43,.22,.2,'D04'],[.70,.48,.20,.2,'B06'],[.30,.70,.22,.18,'C07'],[.56,.72,.24,.17,'D09']];
  cells.forEach((c, idx) => { const [cx,cy,cw,ch,label] = c; rect(slide, ctx, x+cx*w, y+cy*h, cw*w, ch*h, colors[idx%colors.length], { line: ctx.line('#E8F4DC', 2) }); if (opts.labels !== false) text(slide, ctx, label, x+cx*w+cw*w/2-22, y+cy*h+ch*h/2-8, 44, 16, { size: 11, bold: true, color: '#FFFFFF', align: 'center' }); });
  if (opts.showBadge !== false) {
    rect(slide, ctx, x + 14, y + h - 42, 92, 24, '#0A1710', { line: ctx.line('#FFFFFF33', 1) });
    text(slide, ctx, opts.badge || 'SATELITE', x + 24, y + h - 36, 72, 12, { mono: true, bold: true, size: 7.5, color: '#FFFFFF' });
  }
}
export function phone(slide, ctx, x, y, w, h, title = 'Mapa') {
  rect(slide, ctx, x, y, w, h, '#0B120D', { line: ctx.line('#1E2C20', 2) });
  rect(slide, ctx, x + 10, y + 12, w - 20, h - 24, '#14371E');
  drawMap(slide, ctx, x + 10, y + 12, w - 20, h - 24, { monitor: true, labels: false, showBadge: false });
  rect(slide, ctx, x + 18, y + 20, 42, 42, S.green);
  text(slide, ctx, '☰', x + 28, y + 27, 22, 22, { size: 18, bold: true, color: '#FFFFFF', align: 'center' });
  rect(slide, ctx, x + 18, y + h - 150, w - 36, 128, '#124925AA', { line: ctx.line('#A8D98F', 1) });
  text(slide, ctx, 'TALHAO SELECIONADO', x + 34, y + h - 134, 190, 12, { mono: true, bold: true, size: 7.5, color: '#CDEAC0' });
  text(slide, ctx, 'A01 · Soja', x + 34, y + h - 116, 170, 26, { serif: true, bold: true, size: 20, color: '#FFFFFF' });
  pill(slide, ctx, 'Monitorar', x + 34, y + h - 78, 88, '#FFFFFF', S.ink);
  pill(slide, ctx, 'Status', x + 130, y + h - 78, 78, '#FFFFFF', S.ink);
  text(slide, ctx, 'Verde <=5d | Amarelo 6-10d | Vermelho >10d', x + 34, y + h - 50, w - 68, 16, { size: 8, color: '#FFFFFF' });
}
export function workflowNode(slide, ctx, x, y, title, note, icon, color = S.green) {
  rect(slide, ctx, x, y, 174, 112, '#FFFFFF', { line: ctx.line(S.softLine, 1) });
  rect(slide, ctx, x, y, 174, 6, color);
  text(slide, ctx, icon, x + 14, y + 20, 26, 24, { size: 18, bold: true, color });
  text(slide, ctx, title, x + 48, y + 19, 112, 22, { serif: true, bold: true, size: 14, color: S.ink });
  text(slide, ctx, note, x + 14, y + 58, 146, 36, { size: 9, color: S.mid });
}
export function bar(slide, ctx, x, y, w, label, value, max, color, note = '') {
  text(slide, ctx, label, x, y, 190, 18, { size: 10.5, bold: true, color: S.ink });
  rect(slide, ctx, x + 205, y + 4, w - 280, 12, S.pale);
  rect(slide, ctx, x + 205, y + 4, Math.max(8, (w - 280) * value / max), 12, color);
  text(slide, ctx, note || String(value), x + w - 260, y - 1, 250, 22, { size: 10, bold: true, color: S.ink, align: 'right' });
}
