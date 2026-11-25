#!/usr/bin/env python3
"""Insère (ou met à jour) le code v6 public dans index.html : validateur d'animations + intégrations/animations.
Idempotent. Source : gestionnaire/v6/anim-validate.js et public-apply.js."""
import re, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
idx = root / 'index.html'
html = idx.read_text(encoding='utf-8')
v = (root/'gestionnaire/v6/anim-validate.js').read_text(encoding='utf-8')
a = (root/'gestionnaire/v6/public-apply.js').read_text(encoding='utf-8')
m = (root/'gestionnaire/v6/motion.js').read_text(encoding='utf-8')
assert '</script' not in (v+a+m).lower()
block = '<!--V6-PUBLIC-BEGIN--><script id="slx-v6-public">\n' + v + '\n' + m + '\n' + a + '\n</script><!--V6-PUBLIC-END-->'
html = re.sub(r'<!--V6-PUBLIC-BEGIN-->.*?<!--V6-PUBLIC-END-->\n?', lambda m: '', html, flags=re.S)
i = html.rindex('</body>')
html = html[:i] + block + '\n' + html[i:]
hook = "  try{ if(typeof slxV6Apply==='function') slxV6Apply(payload); }catch(e){}\n"
if 'slxV6Apply(payload)' not in html:
    anchor = "  if(payload.theme)senluxeApplyTheme(payload.theme);\n"
    assert anchor in html
    html = html.replace(anchor, anchor + hook, 1)
idx.write_text(html, encoding='utf-8')
print('ok', len(html))
