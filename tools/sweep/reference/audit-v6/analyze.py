"""analyze.py <glob of capture json> : VI vs EN line counts, Vietnamese on EN pages, cut text, titles, redirects."""
import sys, glob, re, collections, json
sys.path.insert(0, 'scripts')
from load import load
VI = re.compile(r'[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]', re.I)
NAMES = ["KHÓI","BỤI","NGUỘI","NẮNG","SƯƠNG","MUỐI","THAN","CÁT","GIÓ","ĐÁ","RÊU","TRO","SÓNG","VỎ","MƯA","KHÔ","ĐẤT","LỬA",
 "BÃO","MEN","VÔI","SỎI","NGÓI","GẠCH","TP. Hồ Chí Minh","Hồ Chí Minh","Hà Nội","Nguyễn Huệ","Nguyễn Thị Minh Khai","Trần Minh Anh",
 "Võ Đức Duy","Bùi Thanh Tú","Đặng Quốc Bảo","Quản lý cửa hàng","Tiếng Việt","Bản đồ mòn"]
def strip(x):
    for n in NAMES: x = x.replace(n, '')
    return x
files = sorted(set(sum([glob.glob(g) for g in sys.argv[1:]], [])))
by = collections.defaultdict(dict)
for f in files:
    d = load(f)
    for r in d['results']:
        by[(r['state'], r['width'])][r['lang']] = r
mode = set((sys.argv[0:1] and []) )
out = collections.OrderedDict()
tot = collections.Counter()
for (st, w), pair in sorted(by.items(), key=lambda kv: (kv[0][1], kv[0][0])):
    vi, en = pair.get('vi'), pair.get('en')
    notes = []
    if vi and en and 'blocks' in vi and 'blocks' in en:
        mv = {b['k']: b for b in vi['blocks']}; me = {b['k']: b for b in en['blocks']}
        for k, b in me.items():
            a = mv.get(k)
            if not a: continue
            if b['lines'] != a['lines']:
                tag = 'EN+' if b['lines'] > a['lines'] else 'VI+'
                tot[tag] += 1
                notes.append(f"  {tag} {a['lines']}->{b['lines']} w{b['w']} {b['tag'][:28]} | VI: {a['t'][:60]} | EN: {b['t'][:60]}")
        only = len(set(mv) ^ set(me))
        if only > 6: notes.append(f"  (keys only in one lang: {only})")
    for lang, r in (('vi', vi), ('en', en)):
        if not r: continue
        for b in r.get('blocks', []):
            if b.get('cut'): tot['cut'] += 1; notes.append(f"  CUT[{lang}] {b['cut']} {b['tag'][:30]} w{b['w']}: {b['t'][:70]}")
        if r.get('scrollers'):
            for s in r['scrollers']: notes.append(f"  SCROLL[{lang}] {s}")
        if r.get('error'): notes.append(f"  ERROR[{lang}] {r['error'][:150]}")
        land = (r.get('landedOn') or '').split('#')[0]
        if land and land != r['route'].split('#')[0]: notes.append(f"  REDIRECT[{lang}] {r['route']} -> {land}")
    if en:
        if VI.search(strip(en.get('title') or '')): notes.append(f"  TITLE-VI[en]: {en['title']}")
        sc = en.get('scan') or {}
        for t in sc.get('text', []):
            if VI.search(strip(t['text'])): tot['vi-text'] += 1; notes.append(f"  VI-IN-EN text <{t['where']}>: {t['text'][:100]}")
        for a in sc.get('attrs', []):
            if not a.get('langVi') and VI.search(strip(a['value'])): tot['vi-attr'] += 1; notes.append(f"  VI-IN-EN @{a['attr']}: {a['value'][:100]}")
        for t in sc.get('loan', []): tot['loan'] += 1; notes.append(f"  LOAN <{t['where']}>: {t['text'][:100]}")
    if vi and en and vi.get('title') == en.get('title') and VI.search(vi.get('title') or ''): notes.append(f"  SAME-TITLE: {vi['title']}")
    if notes: out[f"{st} @{w}"] = notes
for k, v in out.items():
    print(k); print("\n".join(v))
print('TOTALS', dict(tot))
