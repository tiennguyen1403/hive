"""labels.py <glob...>: label-sized blocks (VI text <= 45 chars) whose line count differs between VI and EN."""
import sys, glob, collections
sys.path.insert(0, 'scripts')
from load import load
files = sorted(set(sum([glob.glob(g) for g in sys.argv[1:]], [])))
by = collections.defaultdict(dict)
for f in files:
    for r in load(f)['results']:
        by[(r['state'], r['width'])][r['lang']] = r
skip = ('mbar-title', 'cd-big', 'dg', 'now-cd')
rows = []
for (st, w), pair in sorted(by.items(), key=lambda kv: (kv[0][1], kv[0][0])):
    vi, en = pair.get('vi'), pair.get('en')
    if not (vi and en and vi.get('blocks') and en.get('blocks')): continue
    mv = {b['k']: b for b in vi['blocks']}
    for b in en['blocks']:
        a = mv.get(b['k'])
        if not a or a['lines'] == b['lines']: continue
        if any(s in b['tag'] for s in skip): continue
        if len(a['t']) > 45 and len(b['t']) > 45: continue
        rows.append((w, st, 'EN+' if b['lines'] > a['lines'] else 'VI+', a['lines'], b['lines'], b['w'], b['tag'][:26], a['t'][:44], b['t'][:44]))
for r in rows: print("%4d %-24s %s %d->%d w%-4d %-26s | %-44s | %s" % r)
print(len(rows), 'rows')
