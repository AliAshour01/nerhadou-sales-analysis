import assert from 'node:assert/strict';
// V68 S-01: every tick label reads back to its real value within 0.5%, on one nice 1/2/2.5/5×10ⁿ step.
export function checkTicks(node,label){const ticks=[...node.querySelectorAll('text.axis-tick')];assert(ticks.length>=3,label+' has ticks');const parse=t=>{const m=t.trim().match(/^(-?[\d.,]+)([KMB]?)$/);assert(m,label+' tick '+t);return Number(m[1].replace(/,/g,''))*({K:1e3,M:1e6,B:1e9}[m[2]]||1)};const vals=ticks.map(t=>Number(t.getAttribute('data-tick')));
 ticks.forEach((t,i)=>{const real=vals[i],read=parse(t.textContent);assert(Math.abs(read-real)<=Math.max(1e-9,Math.abs(real)*.005),`${label}: ${t.textContent} vs ${real}`)});
 const step=vals[1]-vals[0];vals.slice(1).forEach((v,i)=>assert(Math.abs(v-vals[i]-step)<=Math.abs(step)*1e-9,label+' even spacing'));const power=10**Math.floor(Math.log10(Math.abs(step)));assert([1,2,2.5,5,10].some(f=>Math.abs(Math.abs(step)/power-f)<1e-9),label+' nice step '+step);return vals}
