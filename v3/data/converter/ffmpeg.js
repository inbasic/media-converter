/* globals WFFmpeg, NFFmpeg, Native, element, restore, log */
'use strict';

let ffmpeg = {
  emit: function() {}
};

function unhandledrejection(msg) {
  if (msg.indexOf('code=EPERM') !== -1) {
    msg += ' (operation not permitted)';
  }
  ffmpeg.log('error', msg);
  ffmpeg.busy = false;
  ffmpeg.counter();
}
window.addEventListener('unhandledrejection', e => {
  unhandledrejection(e.reason.message);
});

chrome.storage.local.get({
  'ffmpeg-path': null,
  'savein-path': null,
  'tmpdir-path': null,
  'server-port': 3002,
  'mode': 'native'
}, prefs => {
  element.settings.mode.value = prefs.mode;

  let isNative = false;

  if (prefs.mode === 'wasm') {
    Native.prototype.spawn = function(path, args) {
      this.run(...args);
    };
    Native.prototype['clean-tmp'] = function() {};
  }
  const FFmpeg = prefs.mode === 'wasm' ? WFFmpeg : NFFmpeg;

  ffmpeg = window.ffmpeg = new FFmpeg({
    ffmpeg: prefs['ffmpeg-path'],
    savein: prefs['savein-path'],
    tmpdir: prefs['tmpdir-path'],
    port: prefs['server-port']
  });
  ffmpeg.log = function(type, e = '-') {
    log.emit(type, e.message || e);
  };
  ffmpeg.counter = function() {
    const queue = ffmpeg.jobs.length + (this.busy ? 1 : 0);
    if (queue) {
      document.title = 'Media Converter (' + queue + ')';
    }
    else {
      document.title = 'Media Converter';
    }
  };
  ffmpeg.onDisconnect(() => {
    if (isNative) {
      document.body.dataset.crashed = true;
    }
    else {
      document.body.dataset.instruction = true;
    }
    document.body.dataset.working = false;
  });
  ffmpeg.on('job', jobs => {
    ffmpeg.jobs = ffmpeg.jobs.concat(jobs);
    ffmpeg.convert().catch(e => unhandledrejection(e.message));
    ffmpeg.counter();
  });
  ffmpeg.on('ffmpeg-path-changed', path => {
    if (path) {
      ffmpeg.config.ffmpeg.path = path;
    }
    else {
      ffmpeg.find().catch(e => ffmpeg.log(e));
    }
  });
  ffmpeg.on('savein-path-changed', path => {
    ffmpeg.config.user.savein = path || ffmpeg.config.user._savein;
  });
  ffmpeg.on('tmpdir-path-changed', path => {
    ffmpeg.config.user.tmpdir = path || ffmpeg.config.user._tmpdir;
  });

  ffmpeg.init().then(obj => {
    isNative = true;
    element.settings.version.textContent = obj.version;
    element.settings.savein.value = element.settings.savein.dataset.value = obj.savein;
    element.settings.tmpdir.value = element.settings.tmpdir.dataset.value = obj.tmpdir;
    element.settings.port.value = element.settings.port.dataset.value = obj.port;

    element.settings.savein.disabled =
    element.settings.tmpdir.disabled =
    element.settings.port.disabled = prefs.mode === 'wasm';

    if (prefs['ffmpeg-path']) {
      return prefs['ffmpeg-path'];
    }
    else {
      return ffmpeg.find().catch(e => {
        if (window.confirm('For the converter to work, FFmpeg command-line tool is needed.\nShould I get it now?')) {
          element.busy.parent.dataset.working = true;
          return ffmpeg.download().then(path => {
            element.busy.parent.dataset.working = false;
            return path;
          });
        }
        throw e;
      });
    }
  })
    // setting FFmpeg path
    .then(path => element.settings.ffmpeg.value = element.settings.ffmpeg.dataset.value = path)
    // creating server
    .then(() => ffmpeg.server())
    // enabling conversion tabs
    .then(() => element.tabs.list.forEach(tab => tab.disabled = false))
    // restoring user settings
    .then(() => restore.emit('restore', () => document.body.dataset.working = false))
    // welcome message
    .then(() => ffmpeg.log('info', 'Select a tab then drag one or multiple media files into the designated box. All the media files will be downloaded to the directory that is set in the settings tab (default directory is your Home directory).'))
    // catching errors
    .catch(e => {
      console.error(e);
      ffmpeg.log('error', e);
      document.body.dataset.working = false;
    });
});
