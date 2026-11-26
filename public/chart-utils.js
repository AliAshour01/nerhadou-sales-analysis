// V68 shared chart helpers: one compact formatter, one nice-axis rule and one category palette.
// app.js is a classic script and keeps byte-identical copies of compact/niceStep/axisFor (tests/chart-utils.mjs checks parity).
const fmt=n=>Number(n).toLocaleString('en-US',{maximumFractionDigits:0});
const unit=a=>a>=1e9?[1e9,'B']:a>=1e6?[1e6,'M']:a>=1e3?[1e3,'K']:[1,''];
// V73 N-10: one precision rule for every compact number, the same as the KPI cards: 2 decimals below 10 of the unit
// (2.03B, 1.46B, 7.34M), 1 decimal from 10 (229.7M, 14M); trailing zeros dropped. digits overrides (axes only).
export function compact(n,digits=null){if(n==null||!Number.isFinite(n))return '—';const [d,s]=unit(Math.abs(n));if(!s)return fmt(n);const k=digits??(Math.abs(n)/d<9.995?2:1);return String(Number((n/d).toFixed(k)))+s}
// Nice steps are 1 / 2 / 2.5 / 5 × 10ⁿ.
export function niceStep(n){const power=10**Math.floor(Math.log10(n||1)),f=n/power;return (f<=1?1:f<=2?2:f<=2.5?2.5:f<=5?5:10)*power}
// includeZero:false lets a bridge truncate its baseline (S-17); callers must then mark the axis break.
export function niceAxis(values,targetTicks=4,{includeZero=true}={}){
 const finite=values.filter(Number.isFinite);let lo=Math.min(...(includeZero?[0]:[]),...finite),hi=Math.max(...(includeZero?[0]:[]),...finite);
 if(!finite.length){lo=0;hi=1}if(lo===hi){if(includeZero||lo===0)hi=lo+1;else{lo=lo-Math.abs(lo)*.1;hi=hi+Math.abs(hi)*.1}}
 const step=niceStep((hi-lo)/targetTicks);return {min:Math.floor(lo/step+1e-9)*step,max:Math.ceil(hi/step-1e-9)*step,step};
}
export function axisTicks(a){return Array.from({length:Math.round((a.max-a.min)/a.step)+1},(_,i)=>+(a.min+i*a.step).toPrecision(12))}
// Tick labels carry as many decimals (max 2) as the step needs, so 1.25M never reads 1.3M.
export function tickLabel(v,axis){const [d,suffix]=unit(Math.max(Math.abs(axis.min),Math.abs(axis.max)));if(!suffix)return Number(v.toFixed(2)).toLocaleString('en-US');const k=[0,1,2].find(k=>Math.abs(Math.round(axis.step/d*10**k)-axis.step/d*10**k)<1e-9)??2;return v===0?'0':String(Number((v/d).toFixed(k)))+suffix}
// S-15: one colour per category everywhere. NOT PROVIDED is always neutral grey.
export const CATEGORY_COLORS={'PHARMA':'#2f5fd0','IBN SINA':'#d9922e','EGY':'#1f9a8a','NERHADOU DIRECT':'#8a63c2','PRIVATE':'#2f5fd0','TENDER':'#1f9a8a','HOSPITALS':'#d9922e','HOSPITALS / UPA':'#d9922e','COMBINED / SOURCE':'#b7c0cc','NOT PROVIDED':'#9aa5b4','OTHERS':'#b7c0cc'};
const FALLBACK=['#c2577a','#5d7fa6','#a07a3c','#3f8f5a','#7a6cc4','#b0603e'];
export function categoryColor(name){const key=String(name??'').trim().toUpperCase();if(!key||key==='NOT PROVIDED')return CATEGORY_COLORS['NOT PROVIDED'];return CATEGORY_COLORS[key]||FALLBACK[[...key].reduce((a,c)=>(a*31+c.charCodeAt(0))>>>0,7)%FALLBACK.length]}
// S-12 / S-18 achievement status thresholds.
export const ACH_THRESHOLDS={good:100,warn:90};
export function achStatus(pct){return pct==null||!Number.isFinite(pct)?'unknown':pct>=ACH_THRESHOLDS.good?'good':pct>=ACH_THRESHOLDS.warn?'warn':'bad'}
// S-16 truncation: never break inside a word; keep the full name for tooltips.
export function truncate(text,maxChars){const s=String(text??'');return s.length<=maxChars?s:s.slice(0,Math.max(1,maxChars-1)).trimEnd()+'…'}
// V72 R-05: approximate rendered width of SVG label text (system sans-serif), so labels can be fitted to a slot
// without a DOM. Upper-case letters are wider than lower-case; the estimate errs wide so labels never overlap.
const NARROW=/[ilIjtf.,'’:;|!()\[\] ]/,WIDE=/[MWmw@%]/;
export function textWidth(text,fontSize=12){let w=0;for(const c of String(text??''))w+=NARROW.test(c)?.32:WIDE.test(c)?.9:/[A-Z0-9]/.test(c)?.68:/[–—…+−]/.test(c)?.62:.56;return w*fontSize}
export function fitLabel(text,maxWidth,fontSize=12){const s=String(text??'');if(textWidth(s,fontSize)<=maxWidth)return s;for(let n=s.length-1;n>0;n--){const t=s.slice(0,n).trimEnd()+'…';if(textWidth(t,fontSize)<=maxWidth)return t}return ''}
if(typeof window!=='undefined')window.nerhadouChart={compact,niceStep,niceAxis,axisTicks,tickLabel,CATEGORY_COLORS,categoryColor,ACH_THRESHOLDS,achStatus,truncate,textWidth,fitLabel};
// V74 V-05: keep the END of a name ("…8MG") when the start would make two labels identical.
export function fitTail(text,maxWidth,fontSize=12){const s=String(text??'');if(textWidth(s,fontSize)<=maxWidth)return s;for(let n=s.length-1;n>0;n--){const t='…'+s.slice(s.length-n).trimStart();if(textWidth(t,fontSize)<=maxWidth)return t}return ''}
// Up to two lines: whole words on the first line, the rest (shortened if needed) on the second.
export function wrapLabel(text,maxWidth,fontSize=12){const s=String(text??'');if(textWidth(s,fontSize)<=maxWidth)return [s];const words=s.split(/\s+/);let first='',i=0;while(i<words.length){const c=first?first+' '+words[i]:words[i];if(textWidth(c,fontSize)<=maxWidth){first=c;i++}else break}if(!first)return [fitLabel(s,maxWidth,fontSize)];return [first,fitLabel(words.slice(i).join(' '),maxWidth,fontSize)]}
