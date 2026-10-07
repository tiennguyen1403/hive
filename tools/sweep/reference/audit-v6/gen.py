"""gen.py config.json out.js [acts.js]: fill cap.template.js with a config (and named actions)."""
import json, sys, pathlib
here = pathlib.Path(__file__).parent
tpl = (here / 'cap.template.js').read_text(encoding='utf-8')
cfg = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding='utf-8'))
acts = pathlib.Path(sys.argv[3]).read_text(encoding='utf-8') if len(sys.argv) > 3 else ''
js = tpl.replace('/*CONFIG*/', 'const CONFIG = ' + json.dumps(cfg, ensure_ascii=False) + ';').replace('/*ACTS*/', acts)
pathlib.Path(sys.argv[2]).write_text(js, encoding='utf-8')
print('wrote', sys.argv[2], len(cfg['states']), 'states')
