import json, sys, collections
def load(f):
    raw = open(f, encoding='utf-8').read()
    return json.loads(raw[raw.find('{'):])
for f in sys.argv[1:]:
    d = load(f)
    errs = [r for r in d['results'] if r.get('error')]
    print(f, 'routes', d['routes'], 'total', d['totalFindings'], d['byDetector'])
    print('  console', len(d['consoleErrors']), 'foreign', len(d['foreign']), 'errors', len(errs))
    for c in d['consoleErrors']: print('   CONSOLE', c['url'].replace('http://127.0.0.1:3200',''), c['text'][:140])
    for r in errs: print('   ERR', r['name'], r['error'][:160])
    per = collections.defaultdict(list)
    for r in d['results']:
        fs = r.get('findings') or {}
        for k in ('smallTarget', 'tinyText', 'inlineBox', 'clipped', 'arrowCursor', 'ratioSpread', 'loneButton'):
            for e in fs.get(k, []):
                per[k].append((r['name'], e))
        if fs.get('horizontalOverflow'): per['overflow'].append((r['name'], fs['horizontalOverflow']))
    for k, v in per.items():
        print(' ==', k, len(v))
        if k in ('inlineBox',):
            c = collections.Counter((e['selector'], e['el'][:50]) for _, e in v)
            for (sel, el), n in c.most_common(40): print('    %3d  %s  <=  %s' % (n, el, sel[:90]))
        else:
            for name, e in v: print('    ', name, json.dumps(e, ensure_ascii=False)[:200])
