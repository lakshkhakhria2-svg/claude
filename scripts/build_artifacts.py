# Build claude.ai-artifact copies of the 4 sites. Usage: python3 scripts/build_artifacts.py OUT_DIR scripts/artifact-urls.json
import re, os, shutil, json, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = sys.argv[1]
urls = json.load(open(sys.argv[2])) if len(sys.argv) > 2 and os.path.exists(sys.argv[2]) else {}
AGENCY = urls.get('agency', '#')
TITLES = {'agency': 'SVK Media', 'cadence': 'Cadence', 'northvault': 'Northvault', 'brightwater': 'Brightwater Cleaning'}
# All content visible at rest (artifact rule): reveal only fades, never hides.
RESTING = '<style>.js .reveal{opacity:1!important;transform:none!important}</style>\n'

def split(html):
    head = re.search(r'<head>(.*?)</head>', html, re.S).group(1)
    body_open = re.search(r'<body([^>]*)>', html)
    body = html[body_open.end():html.rindex('</body>')]
    cls = re.search(r'class="([^"]*)"', body_open.group(1)).group(1)
    head = re.sub(r'\s*<meta charset[^>]*>|\s*<meta name="viewport"[^>]*>', '', head)
    return head, cls, body

def build(name, src, rel_prefix):
    html = open(os.path.join(ROOT, src)).read()
    html = re.sub(r'<!--.*?-->', '', html, flags=re.S)
    head, cls, body = split(html)
    head = re.sub(r'\s*<title>.*?</title>', '', head)
    # plain font stylesheet (no inline onload handler), drop preload/noscript duplicates
    head = re.sub(r'\s*<link rel="preload" as="style"[^>]*>|\s*<noscript>.*?</noscript>', '', head, flags=re.S)
    head = head.replace(' media="print" onload="this.media=\'all\'"', '')
    # Cadence CTA form: move inline onsubmit into a script
    if 'onsubmit=' in body:
        body = re.sub(r' onsubmit="[^"]*"', ' id="cta-form"', body)
        body += '\n<script>document.getElementById("cta-form").addEventListener("submit",function(e){e.preventDefault();this.nextElementSibling.textContent="Thanks! This is a demo, so no email was sent.";});</script>\n'
    fix = lambda s: s.replace(rel_prefix + 'assets/', 'assets/').replace(rel_prefix + 'brand/', 'brand/')
    head, body = fix(head), fix(body)
    if name == 'agency':
        for s in ('cadence', 'northvault', 'brightwater'):
            body = body.replace(f'href="work/{s}/"', f'href="{urls.get(s, "#")}"')
    else:
        body = body.replace('href="../../index.html"', f'href="{AGENCY}"')
    bg = {'agency': '#FDF2F8', 'cadence': '#F0FDFA', 'northvault': '#0F172A', 'brightwater': '#ECFEFF'}[name]
    scheme = 'dark' if name == 'northvault' else 'light'
    page = (f'<title>{TITLES[name]}</title>\n{head.strip()}\n'
            f'<style>:root{{color-scheme:{scheme}}} body{{background:{bg};font-size:16px}}</style>\n{RESTING}'
            f'<div class="{cls}">\n{body.strip()}\n</div>\n')
    d = os.path.join(OUT, name); os.makedirs(os.path.join(d, 'assets'), exist_ok=True)
    open(os.path.join(d, 'index.html'), 'w').write(page)
    for f in ('assets/styles.css', 'assets/site.js'):
        shutil.copy(os.path.join(ROOT, f), os.path.join(d, f))
    if name == 'agency':
        os.makedirs(os.path.join(d, 'assets/work'), exist_ok=True); os.makedirs(os.path.join(d, 'brand'), exist_ok=True)
        for s in ('cadence', 'northvault', 'brightwater'):
            shutil.copy(os.path.join(ROOT, f'assets/work/{s}.jpg'), os.path.join(d, f'assets/work/{s}.jpg'))
        shutil.copy(os.path.join(ROOT, 'brand/svk-media-logo-a.png'), os.path.join(d, 'brand/svk-media-logo-a.png'))

build('agency', 'index.html', '')
for s in ('cadence', 'northvault', 'brightwater'):
    build(s, f'work/{s}/index.html', '../../')
print('built', sorted(os.listdir(OUT)))
