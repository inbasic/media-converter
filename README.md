## Media Converter (imconverter)

Media Converter is a complete cross-platform solution to convert audio and video files built for Firefox browser.

Download Link: https://addons.mozilla.org/en-US/firefox/addon/media-converter-and-muxer/
FAQs page: http://firefox.add0n.com/media-converter.html

![screen shot 2016-04-09 at 16 37 11](https://cloud.githubusercontent.com/assets/12896263/14403567/8ee6129e-fe71-11e5-95cb-779128d247b8.png)

### General information

To compile imconverter project you need to have these command-line packages and libraries available:
* [nodejs](http://nodejs.org/)
* [JPM](https://www.npmjs.com/package/jpm)

### How to compile imconverter

1. Open a new terminal in the root dir (directory contains src, preview, template, and compile folders)
2. Switch to `src` directory and run `jpm xpi` to generate an executable add-on
3. Drop the generated XPI into a Firefox window

### How to try pre-compiled latest version

1. Select the right branch
2. Browse the `builds` directory
3. Download the raw *.xpi file
4. Drag and drop it into Firefox

### For developers
You can connect to imconverter extension and do conversions in background from your extension
https://github.com/inbasic/media-converter/blob/master/connect.md
