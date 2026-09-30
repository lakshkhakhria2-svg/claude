import { Config } from '@remotion/cli/config';
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
// Use the sandbox's preinstalled Chromium headless shell instead of downloading one.
Config.setBrowserExecutable('/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell');
Config.setCodec('h264');
Config.setPixelFormat('yuv420p');
Config.setCrf(18);
