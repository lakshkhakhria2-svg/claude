#!/usr/bin/env python3
"""Build football.html: game.html with three.js inlined, so it runs offline in any browser."""
from pathlib import Path
HERE = Path(__file__).parent
TAG = '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>'
page = (HERE / 'game.html').read_text(encoding='utf-8')
three = (HERE / 'vendor' / 'three.min.js').read_text(encoding='utf-8').replace('</script', '<\\/script')
assert page.count(TAG) == 1, 'three.js tag not found'
out = HERE / 'football.html'
out.write_text(page.replace(TAG, '<script>\n' + three + '\n</script>'), encoding='utf-8')
print(f'Wrote {out} ({out.stat().st_size / 1024:.0f} KB)')
