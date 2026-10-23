"""Apply user-confirmed history rules; retain superseded records for audit only."""
import pathlib,json,re,csv,collections,math
import openpyxl
root=pathlib.Path('/workspace/scratch/0031b03e22a5/upload');out=pathlib.Path('/workspace/sites/nerhadou-commercial-hub/public')
seed=json.loads((out.parent/'private'/'seed.json').read_text());records=[r for r in seed['records'] if not r['series_id'].startswith(('H24_','S23R_','S25R_'))];seed['records']=records;notes=[];issues=[]
num=lambda x:float(x) if isinstance(x,(int,float)) and not isinstance(x,bool) and math.isfinite(x) else None

def identity(label):
 s=re.sub(r'\s+',' ',str(label).upper()).strip().replace('FERRETRON','FERROTRON').replace('MECLLIZIGO','MECLIZIGO').replace('NERHAFLUX','NERHAFLUKS').replace('TRIB GOLD','TRIBGOLD').replace('HI POTENCY','HI-POTENCY').replace('COLON AID','COLON AID')
 brand=next((b for b in ['FERROTRON','CALCITRON','OCTATRON','TRIBGOLD','HI-POTENCY','CHROMITRON','ZINCTRON','AFTER MEAL','COLON AID','VITATRON','ONDALENZ','NERHASILDA','TADANERFI','METHYLTECHNO','MECLIZIGO','NERHAPEZIL','NERCAFIX','NERHACOMINE','ZOLMSOLAN','ZOLMASONE','MELACRYST','LOPRANEST','SPASULANCE','NERDECONG','NERKARDOU','NERHAFLUKS','NOCHOLESTRON'] if b in s),None)
 if not brand:return s,s,s
 if brand=='AFTER MEAL':brand='AFTER MEALS'
 strength=re.search(r'(\d+(?:\.\d+)?)\s*MG',s)
 if not strength and brand=='TADANERFI':strength=re.search(r'MG\s*\((\d+)\)',s)
 strength=strength.group(1) if strength else None
 if brand=='MELACRYST' and not strength and '2023' not in s:strength=None
 if brand=='MECLIZIGO' and not strength and re.search(r'MECLIZIGO\s*25',s):strength='25'
 if brand=='METHYLTECHNO':strength=None
 product=brand+(' '+strength+'MG' if strength else '')
 pack=None
 strips=re.search(r'(\d)\s*\*\s*10',s) or re.search(r'(\d)\s*STRIPS?',s)
 if strips:pack=str(int(strips.group(1))*10)
 elif any(k in s for k in ['PEDIATR','CHILDERN','CHILDREN']):pack='PEDIATRIC';product=brand+' PEDIATRIC'
 elif brand in ['FERROTRON','CALCITRON','OCTATRON','TRIBGOLD','HI-POTENCY','CHROMITRON','ZINCTRON','VITATRON']:
  x=re.search(r'\b(20|30)\b',s);pack=x.group(1) if x else None
 elif strength:
  tail=re.sub(r'\d+(?:\.\d+)?\s*MG',' ',s)
  x=re.search(r'\b(4|5|6|8|14|16|20|30)\b',tail);pack=x.group(1) if x else None
 elif brand=='METHYLTECHNO':
  x=re.search(r'\b(20|30)\b',s);pack=x.group(1) if x else None
 elif brand in ['MELACRYST','NERCAFIX']:
  x=re.search(r'\b(20|30)\b',s);pack=x.group(1) if x else None
 return product,(product+' | '+(pack or 'UNSPECIFIED')),brand

def add(series,year,month,label,u,v,**extra):
 r=dict(id=f'{series}-{year}-{month:02d}-actual',series_id=series,product_id=series,year=year,month=month,product=label,dataset='actual',channel='NOT PROVIDED',distributor='NOT PROVIDED',line='Not provided',units=u,value=v);r.update(extra);records.append(r);return r

# 2021: source blanks are confirmed no sale by Ali; preserve all original IDs.
for r in records:
 if r['year']==2021 and r['month']>0 and r['dataset']=='actual':
  if r['units'] is None:r['units']=0;r['confirmed']=['units']
  if r['value'] is None and r['units']==0:r['value']=0;r['confirmed']=(r.get('confirmed',[])+['value'])
notes.append('2021: blank monthly units were confirmed as no sales by Ali and set to zero. Monthly values use the original annual average price; all-zero no-activity rows have zero value.')
notes.append('2022: comparisons use the reported monthly sales, including full-year totals calculated from the 12 months. Original annual controls are retained for reference; Spasulance hospitals has 2,484 monthly units versus 4,784 on its annual control. No 2,300 units were invented or allocated.')

# 2023: keep annual controls separate; use only reported Jan-Sep detail.
for r in records:
 if r['series_id'].startswith(('H23_','H25_')) and r['dataset']=='actual':
  r['dataset']='retired';r['source']='SUPERSEDED — '+r['source']
sepfile='Total Units From 1 to 9 Final.xlsx';sheet=openpyxl.load_workbook(root/sepfile,read_only=True,data_only=True).worksheets[0];rows=list(sheet.values)
for start,end,ch in [(7,79,'PRIVATE'),(81,97,'HOSPITALS / UPA'),(109,162,'PRIVATE')]:
 for rn in range(start,end+1):
  row=rows[rn-1];series=f'S23R_{rn:03d}';label=row[0];su,sv=num(row[37]),num(row[39]);price=sv/su if su not in (None,0) and sv is not None and sv/su>=0 else None
  if price is not None:seed['prices'][series]=price
  monthly=[num(row[1+3*m]) for m in range(9)]
  if su is not None and abs(sum(v or 0 for v in monthly)-su)>.01:issues.append({'year':2023,'product':label,'type':'source_row_total_difference','detail':f'January–September units sum to {sum(v or 0 for v in monthly):,.2f}; the same report row total is {su:,.2f}. Monthly cells take precedence.'})
  for m,mu in enumerate(monthly,1):
   mv=mu*price if mu is not None and price is not None else (0 if mu==0 and sv==0 else None)
   add(series,2023,m,label,mu,mv,channel=ch,estimated=['value'] if mv is not None else [],source=f'{sepfile} / In market row {rn}; value estimated from this same Jan–Sep row average, never from the unmatched full-year report',comparison_scope='reported January–September',reported_ytd_units=su,reported_ytd_value=sv)
issues.append({'year':2023,'product':'Full-year vs monthly source scope','type':'separate_reporting_scopes','detail':'The annual source does not disclose the same channel scope as Jan–Sep detail. Annual figures and reported monthly figures are separate views. October–December and previous residual allocations are unavailable; no cross-scope balancing is applied.'})
notes.append('2023: January–September uses the reported monthly cells, with Private and Hospitals/UPA kept separate. Annual source controls remain a separate reporting scope. October–December residual estimates have been withdrawn. Monthly values are estimates from each Jan–Sep source row’s own value/units ratio when available. Growth involving 2023 remains withheld as requested; observed monthly units and annual source figures are still displayed. Earlier June/August snapshots duplicate the same reporting history and are not added again.')

# New 2024 is the authoritative complete detailed workbook; retain old summary as retired.
for r in records:
 if r['year'] in [2024,2025] and r['dataset']=='actual':r['dataset']='retired';r['source']='SUPERSEDED — '+r['source']
fname='total units end 2024 (4).xlsx';s=openpyxl.load_workbook(root/fname,read_only=True,data_only=True).active;rows=list(s.values)
for start,end,ch in [(4,90,'PRIVATE'),(97,134,'HOSPITALS / UPA'),(148,177,'PRIVATE')]:
 for rn in range(start,end+1):
  row=rows[rn-1];label=row[1];series=f'H24_{rn:03d}';u,v=num(row[38]),num(row[41]);assert u is not None and v is not None
  price=v/u if u!=0 and v/u>=0 else None
  if price is not None:seed['prices'][series]=price
  add(series,2024,0,label,u,v,channel=ch,source=f'{fname} / Mine row {rn}')
  mus=[num(row[2+3*m]) for m in range(12)];assert all(x is not None for x in mus);assert abs(sum(mus)-u)<.01
  for m,mu in enumerate(mus,1):add(series,2024,m,label,mu,mu*price if price is not None else (0 if u==0 and v==0 else None),channel=ch,estimated=['value'],source=f'{fname} / Mine row {rn}')
control24=num(rows[178][41]);assert abs(sum(r['value'] for r in records if r['year']==2024 and r['month']==0 and r['dataset']=='actual')-control24)<.01
notes.append(f'2024: complete detailed workbook supersedes the older summary. Reported annual value is {control24:,.2f}. Monthly units reconcile for all 155 source rows. Values are estimated from each source row’s annual average price; UPA is kept separate.')

# 2025: latest approved pivot has actual Units and Units Val in all 12 months.
def textnum(s,blank_zero=False):
 t=str(s).strip().replace(',','')
 if not t:return 0.0 if blank_zero else None
 if t=='-':return 0.0
 if t.startswith('(') and t.endswith(')'):t='-'+t[1:-1]
 return float(t)
textrows=list(csv.reader((root/'Pasted text(1).txt').open(),delimiter='\t'));assert len(textrows[2])>=61
assert textrows[2][1].strip()=='Units' and textrows[2][3].strip()=='Units Val'
line='Not provided';leaf=[]
for rn,row in enumerate(textrows[3:],4):
 label=row[0].strip()
 if not label or label=='Grand Total':continue
 if 'line' in label.lower():line=label;continue
 leaf.append(row);series=f'S25R_{rn:03d}';u,v=textnum(row[61]),textnum(row[63]);source=f'Pasted text(1).txt / row {rn}'
 ch='TENDER' if 'TENDER' in label.upper() or 'TENDER' in line.upper() else 'COMBINED / SOURCE'
 add(series,2025,0,label,u,v,channel=ch,line=line,source=source)
 mus=[];mvs=[]
 for m in range(1,13):
  cu,cv=1+5*(m-1),3+5*(m-1);mu,mv=textnum(row[cu],True),textnum(row[cv],True);mus.append(mu);mvs.append(mv)
  add(series,2025,m,label,mu,mv,channel=ch,line=line,source=source+' / reported monthly cells',pivot_blank_zero=not row[cu].strip() or not row[cv].strip())
 assert abs(sum(mus)-u)<.01,(label,sum(mus),u)
 if abs(sum(mvs)-v)>.01:issues.append({'year':2025,'product':label,'type':'rounding_difference','detail':f'Annual value minus rounded monthly values: EGP {v-sum(mvs):g}.'})
grand=textrows[-1];control25=textnum(grand[63]);units25=textnum(grand[61]);annual25=sum(textnum(r[63]) for r in leaf)
assert sum(textnum(r[61]) for r in leaf)==units25
assert abs(annual25-control25)<=len(leaf)
for m in range(12):assert sum(textnum(r[1+5*m],True) for r in leaf)==textnum(grand[1+5*m])
notes.append(f'2025: latest approved pasted report supplies Actual Units and Actual Units Value for all 12 months. All 34 product/line leaf rows reconcile to annual units; monthly company units reconcile to every displayed grand total. Annual units: {units25:,.0f}. Reported annual value: EGP {control25:,.0f}; product-row value sum: EGP {annual25:,.0f}. Value differences of one or two EGP are retained as displayed rounding. Line subtotals and Grand Total are excluded from product summation; HI-POTENCY entries in different lines remain separate signed records. Blank cells in this complete pivot denote no reported activity (zero). Targets are never substituted for actual sales. Earlier 2025 sources are superseded.')
for r in records:
 p,k,b=identity(r['product']);r['comparison_product']=p;r['comparison_pack']=k;r['brand']=b
 r['report_group']='Historical source' if r['year']<2026 else 'Current actual'
seed['version']='history-v11';seed['notes']=notes;seed['issues']=issues;seed['controls']={'2024':{'value':control24},'2025':{'value':control25,'productValue':annual25,'units':units25}}
assert len({r['id'] for r in records})==len(records)
(out.parent/'private'/'seed.json').write_text(json.dumps(seed,ensure_ascii=False,separators=(',',':')))
print('Updated history:',len(records),'records; issues',dict(collections.Counter(i['type'] for i in issues)))
for year in range(2021,2027):
 rr=[r for r in records if r['year']==year and r['dataset']=='actual'];print(year,'annual rows',sum(r['month']==0 for r in rr),'monthly rows',sum(r['month']>0 for r in rr),'monthly units',sum(r['units'] or 0 for r in rr if r['month']>0),'monthly value',sum(r['value'] or 0 for r in rr if r['month']>0))
for issue in issues:
 if issue['type']!='rounding_difference':print(issue)
