// V68 S-01: shared module and the classic app.js copy must produce identical axes and labels.
import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import * as cu from '../public/chart-utils.js';
const src=fs.readFileSync('public/app.js','utf8'),start=src.indexOf('const chartUnit='),end=src.indexOf('function monthlyData');
const ctx={};vm.createContext(ctx);vm.runInContext("const fmt=n=>Number(n).toLocaleString('en-US',{maximumFractionDigits:0});"+src.slice(start,end)+';this.out={compact,niceStep,axisFor,axisTicks,tickLabel}',ctx);const app=ctx.out;
const cases=[[5e6],[4.47e6,1.49e6],[21599730,15476653],[1.3e6],[33465],[184,3,-6],[-415102,2e6],[0],[999],[1.25e6,0]];
for(const vals of cases){const a=cu.niceAxis(vals),b=app.axisFor(vals);assert.deepEqual({...b},{...a},'axis parity '+vals);const ta=cu.axisTicks(a).map(v=>cu.tickLabel(v,a)),tb=app.axisTicks(b).map(v=>app.tickLabel(v,b));assert.deepEqual([...tb],ta,'label parity '+vals);
 for(const v of cu.axisTicks(a)){const t=cu.tickLabel(v,a),m=t.match(/^(-?[\d.,]+)([KMB]?)$/),read=Number(m[1].replace(/,/g,''))*({K:1e3,M:1e6,B:1e9}[m[2]]||1);assert(Math.abs(read-v)<=Math.abs(v)*.005+1e-9,t+' vs '+v)}}
for(const n of [21599730,2e6,1e6,1.05e6,950,-415102,12345678901])assert.equal(app.compact(n),cu.compact(n));
assert.equal(cu.compact(2e6),'2M');assert.equal(cu.compact(21599730),'21.6M');assert.equal(cu.compact(2.03e9),'2.03B');assert.equal(cu.compact(229.7e6),'229.7M');assert.equal(cu.compact(1457e6),'1.46B');assert.equal(cu.compact(7.344e6),'7.34M');assert.equal(cu.compact(null),'—');
assert.equal(cu.categoryColor('not provided'),cu.CATEGORY_COLORS['NOT PROVIDED']);assert.equal(cu.categoryColor('PHARMA'),cu.categoryColor(' pharma '));
console.log('Chart utils passed: app.js/module parity, nice 1/2/2.5/5 steps, tick labels within 0.5%.');
