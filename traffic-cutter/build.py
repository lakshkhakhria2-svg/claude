#!/usr/bin/env python3
"""Build lane-splitter.html: one self-contained file you can share and open in any browser.

index.html is the page body used for the hosted version (it loads three.js from a CDN).
This script wraps it in a full HTML document and inlines vendor/three.min.js, so the
built file runs offline by double-clicking it. Fonts still come from Google Fonts when
online and fall back to system fonts when not.

Usage: python3 build.py
"""
from pathlib import Path

HERE = Path(__file__).parent
CDN_TAG = '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>'

page = (HERE / 'index.html').read_text(encoding='utf-8')
three = (HERE / 'vendor' / 'three.min.js').read_text(encoding='utf-8').replace('</script', '<\\/script')

if page.count(CDN_TAG) != 1:
    raise SystemExit('Could not find the three.js <script> tag in index.html')

# Everything before the first <div> (title, meta, font links, styles) belongs in <head>.
split = page.index('<div class="wrap">')
head, body = page[:split], page[split:]
body = body.replace(CDN_TAG, '<script>\n' + three + '\n</script>')

out = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
{head.strip()}
</head>
<body>
{body.strip()}
</body>
</html>
"""
dest = HERE / 'lane-splitter.html'
dest.write_text(out, encoding='utf-8')
print(f'Wrote {dest} ({dest.stat().st_size / 1024:.0f} KB)')
