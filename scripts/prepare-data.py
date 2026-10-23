"""Read source workbooks into immutable, separately identified reporting series."""
import json, pathlib, math
import openpyxl
root=pathlib.Path('/workspace/scratch/0031b03e22a5/upload')
out=pathlib.Path('/workspace/sites/nerhadou-commercial-hub/public')
records=[]; prices={}; notes=[]
def num(x):
 return float(x) if isinstance(x,(int,float)) and not isinstance(x,bool) and math.isfinite(x) else None
def add(series,year,month,label,units,value,channel='NOT PROVIDED',distributor='NOT PROVIDED',line='Not provided',dataset='actual',**extra):
 r=dict(id=f'{series}-{year}-{month:02d}-{dataset}',series_id=series,product_id=series,product=str(label).strip(),year=year,month=month,channel=channel,distributor=distributor,line=line,dataset=dataset,units=num(units),value=num(value),**extra)
 records.append(r);return r
files={2021:'total units 2021 new1 24-1-2022 (1).xlsx',2022:'total units 2022 (new target) send  (1).xlsx',2023:'Total Units 2023 MArket 2-13-2024 print (1).xlsx',2024:'Total 2024 (1).xlsx',2025:'Total 2025 Updated Actual sales Final (2).xlsx'}
for year,name in files.items():
 w=openpyxl.load_workbook(root/name,read_only=True,data_only=True); rows=list(w.active.values)
 if year in (2021,2022):
  ranges=[(4,21),(23,27),(39,41),(44,47),(51,54)] if year==2021 else [(7,28),(30,33),(45,66)]
  offset,annual=(1,37) if year==2021 else (2,38)
  for start,end in ranges:
   for rn in range(start,end+1):
    row=rows[rn-1];label=row[0]
    if not isinstance(label,str):continue
    series=f'P{year}_{rn:03d}'; u,v=num(row[annual]),num(row[annual+3]);channel='HOSPITALS' if (year==2021 and 23<=rn<=27) or (year==2022 and 30<=rn<=33) else 'PRIVATE'
    price=v/u if u and v is not None and v/u>=0 else None
    if price is not None:prices[series]=price
    source=f'{name} / Mine / row {rn}'
    add(series,year,0,label,u,v,channel,source=source)
    monthly=[num(row[offset+3*m]) for m in range(12)]
    if u is not None and abs(sum(x or 0 for x in monthly)-u)>.01:notes.append(f'{year}: {label.strip()} ({channel}): annual units {u:g}, known monthly units {sum(x or 0 for x in monthly):g}.')
    for m,mu in enumerate(monthly,1):add(series,year,m,label,mu,mu*price if mu is not None and price is not None else None,channel,estimated=['value'] if mu is not None and price is not None else [],source=source)
 elif year in (2023,2024):
  indices=range(3,133) if year==2023 else list(range(3,12))+list(range(15,41))
  for rn in indices:
   r=rows[rn-1];add(f'P{year}_{rn:03d}',year,0,r[0],r[1],r[3 if year==2023 else 4],source=f'{name} / row {rn}')
  notes.append(f'{year}: annual totals only. No monthly distribution inferred.')
 else:
  for rn in range(13,54):
   r=rows[rn-1];label=r[0]
   if isinstance(label,str) and 'LINE' not in label.upper():add(f'P2025_A{rn:03d}',2025,0,label,r[4],r[6],source=f'{name} / Lines / row {rn} annual report')
  for rn in range(16,78):
   r=rows[rn-1];label=r[11]
   if not isinstance(label,str) or 'LINE' in label.upper():continue
   for m in range(1,13):add(f'P2025_M{rn:03d}',2025,m,label,None,r[13+(m-1)*3],source=f'{name} / Lines / row {rn} monthly report')
  notes.append('2025: monthly value and annual units/value have different report grains. Monthly units are unavailable. Saved source filters are retained.')
 w.close()
current=json.loads((out.parent/'private'/'data.json').read_text());groups={}
for r in current['rows']:
 key=(r['product'],r['distributor'],r['channel'],r['line'])
 if key not in groups:groups[key]=f'P2026_{len(groups)+1:03d}'
aggregated={}
for r in current['rows']:
 key=(r['product'],r['distributor'],r['channel'],r['line']); series=groups[key]; k=(series,r['month'])
 if k not in aggregated:aggregated[k]=add(series,2026,r['month'],r['product'],0,0,r['channel'],r['distributor'],r['line'],source='Total Master Sheet aug 2026.xlsx / DataSource, grouped product/distributor/channel/line')
 aggregated[k]['units']+=r['units'];aggregated[k]['value']+=r['value']
for i,(p,t) in enumerate(current['targets'].items(),1):add(f'T2026_{i:03d}',2026,0,p,None,None,dataset='target',target_units=t['monthly']*12,target_value=t['monthly']*12*t['price'],source_price=t['price'],source='2026 Target2 provisional annual plan')
notes+=['2021/2022 monthly values are estimates: source annual value / source annual units × monthly units. The baseline annual average price remains fixed after edits.','Historical pack equivalence is not normalized. IDs preserve source row/pack/channel distinctions; similar names are not automatically merged.','2026 covers January–August only. Missing source cells remain unknown, never zero.','Stock was not included in the existing snapshot. Stock can be entered separately as dated snapshots.']
assert len({r['id'] for r in records})==len(records)
for y,total in [(2021,451707406.27625),(2022,609794545.2324562),(2023,975675369),(2024,1763684115.9916)]:
 actual=sum(r['value'] or 0 for r in records if r['year']==y and r['month']==0 and r['dataset']=='actual');assert abs(actual-total)<.1,(y,actual,total)
(out.parent/'private'/'seed.json').write_text(json.dumps({'records':records,'prices':prices,'notes':notes,'currentYear':2026,'source':current['source']},ensure_ascii=False,separators=(',',':')))
print('Prepared',len(records),'records;',len(prices),'fixed annual average prices')

# Apply the latest user-approved source replacements and residual rules.
import subprocess,sys
subprocess.run([sys.executable,str(pathlib.Path(__file__).with_name("refresh-history.py"))],check=True)
