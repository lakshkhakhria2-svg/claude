#!/usr/bin/env bash
# Builds the web images used by index.html from the 1440x900 screenshots in assets/work/.
set -euo pipefail
cd "$(dirname "$0")/../assets/work"
for s in cadence northvault brightwater; do
  ffmpeg -loglevel error -y -i "$s.jpg" -c:v libwebp -quality 72 "$s.webp"
  ffmpeg -loglevel error -y -i "$s.jpg" -vf scale=720:-1 -c:v libwebp -quality 70 "$s-thumb.webp"
done
ls -la
