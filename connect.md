#####How to use [media converter](https://addons.mozilla.org/en-US/firefox/addon/media-converter-and-muxer/) from a Firefox extension:
  1. Make sure "media converter" extension is installed,
  2. Connect to the "connect.remote" global module,
  3. Register a job and wait for the response and progress.

#####Check to see if media converter is installed
Before using media converter extension remotely, you need to make sure it is installed in users current profile
```js
var prefs = require("sdk/preferences/service");
var installed = (function () {
  var name = "extensions.jid1-kps5PrGBNtzSLQ@jetpack.version";
  return !!prefs.get(name);
})();
console.error("is media converter installed?", installed);
```
media converter clears its version preference in case of receiving `disable` or `uninstall` [signals](https://developer.mozilla.org/en-US/Add-ons/SDK/Tutorials/Listening_for_load_and_unload). So it is safe to relay on this preference to make sure media converter is available.

#####How to connect to media converter
When media converter is installed, it will register a global module. You can access this module from your extension
```js
var {Cu} = require("chrome");
var connect = (function () {
  var c = {};
  var path = "resource://jid1-kps5prgbntzslq-at-jetpack/imconverter/data/shared/connect.jsm";
  Cu.import(path, c);
  return c;
})();
```
#####Is media converter functional?
Media converter is only functional if user has FFmpeg installed. There is an internal module to check FFmpeg status
```js
connect.remote.register("can-operate", function (path) {
  console.error("ffmpeg is installed at", path);
});
```
The output is either the FFmpeg physical path or an error message. If FFmpeg is not installed, it is recommended to open media converter's UI to let user install and configure FFmpeg
```js
var {Cc, Ci} = require("chrome");
Cc["@mozilla.org/embedcomp/window-watcher;1"]
      .getService(Ci.nsIWindowWatcher)
      .openWindow(null, "chrome://imconverter/content/ui.xul", "media converter", "chrome,centerscreen,resizable=yes", null);
```

#####How to convert a video or an audio file to MP3 format
You can simply do the conversion and listen for the result as well as the progress
```js
var callback = function (e) {
  console.error('MP3 conversion is done with/without errors', e);
};
callback.audio = '/Users/.../test.aac';
callback.quality = '-q:a 0';
callback.listener = {
  progress: function (p) {
    console.error('MP3 conversion progress', p);
  }
}
connect.remote.register("mp3-conversion", callback);
```
`callback.quality` can be one of [these values](https://trac.ffmpeg.org/wiki/Encode/MP3). You can optionally provide `callback.output` as well. If omitted, media converter generates an output file with the same name but MP3 extension in the same folder. It also takes care of duplications. Format of `callback.audio` and `callback.output` could be either an string or an [`nsIFile`](https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIFile) file object.

#####How to extract original audio file from a video or an audio file
Format of job request is similar to MP3 conversion:
```js
var callback = function (e) {
  console.error('media extraction is done with/without errors', e);
}
callback.audio = '/Users/.../test.aac';
callback.listener = {
  progress: function (p) {
    console.error('audio extraction progress', p);
  }
}
connect.remote.register("audio-muxing", callback)
````
#####How to download a media file with Firefox download manager
Media converter lets you download a link as follows
```js
var callback = function (e) {
  console.error('download is done with/without error', e);
}
callback.url = "http://.../video.mp4";
callback.file = '/Users/.../video.mp4';
callback.listener = {
  progress: function (p) {
    console.error('download progress', p);
  }
}
connect.remote.register("download-media", callback)
```
This call requires `callback.file` as it is not possible to detect file-name or its format just from the download link.

#####Other undocumented operations:
There are some other operations media converter is capable of, but they are still not documented:
  1. `"install-ffmpeg"`: install FFmpeg either by searching users `$PATH` environment variable or getting a fresh copy from sourceforge.
  2. `"get-media-info"`: get some useful information about a local audio/video file
  3. `"audio-video-mixing"`: combine a video file with an audio file. This is useful when you have to DASH streams and would like to combine them into a single playable video file.
  3. `"volume-adjusting"`: change volume of a media file (requires media converter version >= 0.1.2)
  4. `"scale-video"`: scale a video file (requires media converter version >= 0.1.2)




