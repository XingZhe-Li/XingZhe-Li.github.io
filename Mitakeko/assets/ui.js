import { parseNote,noteToMidi } from './music/theory.js';
export const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const pretty=value=>String(value).replaceAll('#','♯').replaceAll('b','♭');
export function icon(name) {
  const paths={play:'<path d="m9 5 11 7-11 7Z"/>',stop:'<rect x="6" y="6" width="12" height="12" rx="2"/>',check:'<path d="m5 12 4 4L19 6"/>',arrow:'<path d="M4 12h15m-6-6 6 6-6 6"/>',sound:'<path d="m4 9h4l5-4v14l-5-4H4Z"/><path d="M17 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/>',book:'<path d="M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1m0-14c3-2 6-2 9-1v14c-3-1-6-1-9 1Zm0 0v14"/>',download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',note:'<path d="M10 17V5l10-2v12M10 7l10-2"/><ellipse cx="7" cy="18" rx="3" ry="2"/><ellipse cx="17" cy="16" rx="3" ry="2"/>',bookmark:'<path d="M6 3h12v18l-6-4-6 4Z"/>',search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>'};
  return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.note}</svg>`;
}
export function options(values,current,label=value=>value) {return values.map(value=>`<option value="${esc(value)}" ${value===current?'selected':''}>${esc(label(value))}</option>`).join('');}
export function noteChips(notes) {return `<div class="note-chips">${notes.map(note=>`<button type="button" class="note-chip" data-lab-action="note" data-note="${esc(note)}" aria-label="试听 ${esc(note)}">${esc(pretty(note))}</button>`).join('')}</div>`;}
export function staffSvg(note='C4') {
  const p=parseNote(note),y=110-((p.octave-4)*7+p.index)*5;let ledger='';
  for(let ly=110;ly<=y;ly+=10)ledger+=`<line x1="154" x2="190" y1="${ly}" y2="${ly}"/>`;
  for(let ly=50;ly>=y;ly-=10)ledger+=`<line x1="154" x2="190" y1="${ly}" y2="${ly}"/>`;
  const accidental=p.accidental>0?'♯'.repeat(p.accidental):'♭'.repeat(-p.accidental);
  return `<svg class="staff-svg" viewBox="0 0 300 175" role="img" aria-label="高音谱表上的${esc(note)}"><g stroke="currentColor" opacity=".35">${[60,70,80,90,100].map(y=>`<line x1="20" x2="280" y1="${y}" y2="${y}"/>`).join('')}</g><text x="29" y="102" font-family="Segoe UI Symbol,serif" font-size="62" fill="currentColor">𝄞</text><g stroke="currentColor">${ledger}<line x1="181" x2="181" y1="${y}" y2="${y-32}"/></g><ellipse cx="173" cy="${y}" rx="9" ry="6" transform="rotate(-18 173 ${y})" fill="currentColor"/>${accidental?`<text x="140" y="${y+5}" fill="currentColor" font-size="22">${accidental}</text>`:''}<text x="20" y="166" fill="currentColor" font-size="10" opacity=".55">高音谱表 · C4为中央C</text></svg>`;
}
export function contourSvg(notes) {
  const pts=notes.map((n,i)=>n?`${22+i*35},${112-(noteToMidi(n)-60)*6}`:null);
  const path=pts.map((p,i)=>p?`${!i||!pts[i-1]?'M':'L'}${p}`:'').join(' ');
  return `<svg class="motif-contour" viewBox="0 0 580 142" role="img" aria-label="四小节的旋律轮廓"><g stroke="currentColor" opacity=".15">${[22,162,302,442,578].map(x=>`<line x1="${x}" x2="${x}" y1="16" y2="121"/>`).join('')}</g><path d="${path}" fill="none" stroke="currentColor" stroke-width="2"/>${pts.filter(Boolean).map(p=>`<circle cx="${p.split(',')[0]}" cy="${p.split(',')[1]}" r="4" fill="currentColor"/>`).join('')}<text x="22" y="136" font-size="10" fill="currentColor" opacity=".6">每格一拍 · 在重复中寻找变化</text></svg>`;
}
