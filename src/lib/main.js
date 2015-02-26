var utils          = require('./system/utils'),
    ffmpeg         = require('./ffmpeg'),
    downloader     = require("./system/downloader"),
    hotkey         = require('./hotkey'),
    toolbarbutton  = require('./system/toolbarbutton'),
    config         = require('./config');

function eReport (e) {
  console.error(e);
}

// Installing hotkey if pref is set
function onCommand () {
  utils.windows.open(config.urls.ui).focus();
}

hotkey.install(onCommand);
// Installing toolbarbutton
toolbarbutton.install(onCommand);
// init
exports.main = function(options, callbacks) {
  if (options.loadReason == "startup" || options.loadReason == "install") {
    welcome();
  }
  if (options.loadReason == "enable") {
    utils.prefs.version =  utils.manifest.version;
  }
}
exports.onUnload = function (reason) {
  // version pref is used by other addons to detect the existence of this extension
  if (reason === "disable") {
    utils.prefs.version = "";
  }
}
// welcome page
function welcome () {
  if (utils.prefs.welcome) {
    if (utils.prefs.version !== utils.manifest.version) {
      var params = "v=" + utils.manifest.version + (utils.prefs.version ? "&p=" + utils.prefs.version + "&type=upgrade" : "&type=install");
      utils.timer.setTimeout(function () {
        utils.windows.openHome(params);
      }, 1000);
    }
  }
  utils.prefs.version =  utils.manifest.version;
}
// APIs
var connect = {};
utils.import("shared/connect.jsm", connect);
connect.remote.register = function (request, callback) {
  callback = callback || function (){};
  var audio = callback.audio || "",
      video = callback.video || "",
      output = callback.output || null,
      url = callback.url || null,
      file = callback.file || null,
      listener = callback.listener || null,
      quality = callback.quality || null,
      level = callback.level || 1.0,
      divide = callback.divide || 1.0,
      multiply = callback.multiply || 1.0;

  switch (request) {
  case "can-operate":
    ffmpeg.checkFFmpeg().then(callback, callback);
    break;
  case "install-ffmpeg":
    ffmpeg.install(listener).then(callback, callback);
    break;
  case "get-media-info":
    ffmpeg.getInfo(audio || video).then(callback, callback);
    break;
  case "mp3-conversion":
    ffmpeg.toMP3(audio || video, output, quality, listener).then(callback, callback);
    break;
  case "volume-adjusting":
    ffmpeg.volume(audio || video, output, level, listener).then(callback, callback);
    break;
  case "scale-video":
    ffmpeg.scale(audio || video, output, divide, multiply, listener).then(callback, callback);
    break;
  case "audio-muxing":
    ffmpeg.toAudio(audio || video, output, listener).then(callback, callback);
    break;
  case "audio-video-mixing":
    ffmpeg.toCombined(audio, video, output, listener).then(callback, callback);
    break;
  case "download-media":
    downloader.get(url, file, listener).then(callback, callback);
    break;
  default:
    callback(Error('main.js -> remote -> unknown request'));
  }
}
