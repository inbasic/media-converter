'use strict';

var utils      = require('./system/utils'),
    config     = require('./config'),
    downloader = require('./system/downloader'),
    Promise    = utils.Promise;

exports.find = function () {
  var isWindows = utils.root.os === 'WINNT';
  var locs = utils.env.PATH
    .split(isWindows ? ';' : ':');
  locs.push(utils.file.relativePath('ProfD', []).path);
  locs = locs
    .map(utils.file.absolutePath)
    .map(function (file) {
      file.append(isWindows ? 'FFmpeg.exe' : 'ffmpeg');
      return file;
    });
  var file = locs.reduce(function (p, c) {
    return p || (utils.file.exists(c) ? c : null);
  }, null);

  if (file) {
    return Promise.resolve(file.path);
  }
  return Promise.reject(Error('ffmpeg.js -> find -> file does not exist'));
};

function isValidSize (file) {
  if (file.exists()) {
    // static build
    if (file.fileSize > config.size.ffmpeg) {
      return Promise.resolve(true);
    }
    else {
      return new Promise(function (resolve, reject) {
        var cp = utils.child_process.spawn(file, ['-version']);
        cp.on('close', function (code) {
          if (code === 0) {
            resolve(file.path);
          }
          else {
            reject(Error('ffmpeg.js -> isValidSize -> Executable return code is ' + code));
          }
        });
      });
    }
  }
  else {
    return Promise.reject(Error('ffmpeg.js -> isValidSize -> invalid file size'));
  }
  return file.exists() && file.fileSize > config.size.ffmpeg;
}
exports.checkFFmpeg = function () {
  var ffmpeg = utils.prefs.ffmpeg;
  if (ffmpeg) {
    var file = utils.file.absolutePath(ffmpeg);
    return isValidSize(file);
  }
  return exports.find().then(function (path) {
    console.error(path);
    var file = utils.file.absolutePath(path);
    return isValidSize(file).then(function () {
      console.error(path);
      utils.prefs.ffmpeg = path;
      return path;
    });
  });
};

function execute(args, listener) {
  var d = new Promise.defer();
  listener = listener || {};
  var isDone = false, result = {
    exitCode: -1,
    stderr: '',
    stdout: ''
  };
  exports.checkFFmpeg().then(function () {
    var ffmpeg = utils.prefs.ffmpeg;
    var cp = utils.child_process.spawn(ffmpeg, typeof args === 'string' ? args.split(/\s+/) : [].concat.apply([], args));
    cp.stdout.on('data', function (data) {
      result.stdout += data;
      if (listener.stdout) {
        listener.stdout(data);
      }
    });
    cp.stderr.on('data', function (data) {
      result.stderr += data;
      if (listener.stderr) {
        listener.stderr(data);
      }
    });
    cp.on('close', function (code) {
      isDone = true;
      result.exitCode = code;
      d.resolve(result);
    });
    listener.abort = function () {
      if (cp && !isDone) {
        cp.kill(true);
        d.reject(Error('ffmpeg.js -> execute -> unexpected exit signal received'));
        return true;
      }
      return false;
    };
    utils.unload.when(function () {
      listener.abort();
    });
  });
  return d.promise;
}
exports.execute = execute;

utils.XPCOMUtils.defineLazyGetter(exports, 'install', function () {
  var os = utils.root.os,
      isWindows = os === 'WINNT',
      pageURL = config.urls.ffmpeg.replace('%os', os) + (isWindows ? '.exe' : ''),
      file = utils.file.relativePath('ProfD', ['ffmpeg' + (isWindows ? '.exe' : '')]);

  return function (listener) {
    var d = new Promise.defer();
    if (isValidSize(file)) {
      var confirm = utils.windows.getActive().confirm(
        utils.l10n('msg.ffmpeg_overwrite')
      );
      if (!confirm) {
        return Promise.reject(Error('ffmpeg.js -> install -> ffmpeg found and user refused to overwrite it'));
      }
    }
    if (file.exists()) {
      file.remove(false);
    }
    utils.Request({
      url: pageURL,
      onComplete: function (response) {
        if (response.status === 200) {
          var url = (new RegExp(pageURL.replace('https', 'http.{0,1}') + '[^\"]*')).exec(response.text);
          if (!url) {
            return d.reject(Error('ffmpeg.js -> install -> could not resolve FFmpeg\'s download link from download page'));
          }
          url = url[0].replace(/\&amp\;/g, '&');

          file.create(utils.file.nsIFile.NORMAL_FILE_TYPE, 755);
          var internal = {
            progress: function (p) {
              if (listener && listener.progress) {
                listener.progress(p);
              }
            },
            done: function () {
              if (isValidSize(file)) {
                utils.timer.setTimeout(function () {
                  file.permissions = 755;
                  d.resolve(file.path);
                }, config.durations.permissionOverwrite);
              }
              else {
                d.reject(Error('ffmpeg.js -> install -> invalid file size'));
              }
            },
            error: function () {
              d.reject(Error('ffmpeg.js -> install -> download has been canceled'));
            }
          };
          downloader.get(url, file, internal);
        }
      }
    }).get();
    return d.promise;
  };
});

var analyser = {
  duration: function (str) {
    var duration = /Duration\:\s(\d+)\:(\d+)\:(\d+)\.(\d+)/.exec(str);
    return {
      h: duration && duration.length ? +duration[1] : null,
      m: duration && duration.length ? +duration[2] : null,
      s: duration && duration.length ? +duration[3] : null,
      ms: duration && duration.length ? +duration[4] : null
    };
  },
  time: function (str) {
    var time = /^(\d+)\:(\d+)\:(\d+)\.(\d+)/.exec(str.split('time=').pop());
    return {
      h: time && time.length ? +time[1] : null,
      m: time && time.length ? +time[2] : null,
      s: time && time.length ? +time[3] : null,
      ms: time && time.length ? +time[4] : null
    };
  },
  version: function (result) {
    var version = /version\s([^\s]+)/.exec(result.stderr);
    return version && version.length ? version[1] : null;
  },
  buitOn: function (result) {
    var buitOn = /built on (.*) with gcc/.exec(result.stderr);
    return buitOn && buitOn.length ? new Date(buitOn[1]) : null;
  }
};

function obj2num (obj) {
  return obj.ms + obj.s * 1000 + obj.m * 60 * 1000 + obj.h * 60 * 60 * 1000;
}

function percentage (report) {
  var duration, time, data = '';

  return {
    step: function (d) {
      data += d;
      if (!duration) {
        var tmp1 = analyser.duration(data);
        if (tmp1.ms !== null) {
          duration = obj2num(tmp1);
        }
      }
      if (duration) {
        var tmp2 = analyser.time(data);
        if (tmp2.ms !== null) {
          time = obj2num(tmp2);
          report(Math.round(time / duration * 100), time, duration);
        }
      }
    },
    get data () {
      return data;
    }
  };
}

function knownErrors (str) {
  if (str.indexOf('already exists. Overwrite') !== -1) {
    return 'Output already exists.';
  }
  if (str.indexOf('Could not find codec parameters') !== -1) {
    return 'Could not find codec parameters.';
  }
  if (str.indexOf('No such file') !== -1) {
    return 'No such file or directory.';
  }
  if (str.indexOf('does not contain any stream') !== -1) {
    return 'Input does not contain any stream.';
  }
  if (str.indexOf('maybe incorrect parameters such as bit_rate, rate, width or height') !== -1) {
    return 'Cannot scale to this ratio, please change the scale parameters.';
  }
  console.error(str);
  return null;
}

function getExtension (path) {
  var tmp = /\.([^\.\/\\]+)$/.exec(path);
  return tmp && tmp.length ? tmp[1] : '';
}

exports.getInfo = function (path) {
  if (path && !utils.file.exists(path)) {
    return Promise.reject(Error('ffmpeg.js -> getInfo -> file does not exist'));
  }
  return new execute('-i "' + path + '"').then(function (result) {
    var tmp = {};
    for (var name in analyser) {
      tmp[name] = analyser[name](result.stderr);
    }
    return tmp;
  });
};

exports.toMP3 = function (input, output, quality, listener) {
  if (!utils.file.exists(input)) {
    return Promise.reject(Error('ffmpeg.js -> toMP3 -> file does not exist'));
  }

  var internal, perct;
  // attaching abort to the external listener
  if (listener) {
    Object.defineProperty(listener, 'abort', {
      get: function () {
        return internal.abort || listener.abort || function () {};
      }
    });
  }
  if (listener && listener.progress) {
    perct = new percentage(listener.progress);
    internal = {stderr: perct.step};
  }

  var ext = getExtension(input);
  output = output || input.replace(' - DASH', '').replace(ext ? '.' + ext : '', '') + '.mp3';
  output = utils.file.checkDuplicate(output);

  var args = utils.prefs.toMP3.split(/\s+/).map(function (s) {
    return s.replace('%input', input)
      .replace(/\%output[\.\w]*/, output);
  });
  var i = args.indexOf('%quality');
  if (i !== -1) {
    args[i] = (quality || '-q:a 0').split(/\s+/);
  }

  return new execute(args, internal)
  .then(function (result) {
    if (result.exitCode === 0) {
      return true;
    }
    var stderr = perct ? perct.data : result.stderr;
    var tmp = knownErrors(stderr);
    throw Error(tmp ? 'ffmpeg.js -> toMP3 -> ' + tmp : 'check error console for the complete error report');
  });
};

exports.toAudio = function (input, output, listener) {
  if (!utils.file.exists(input)) {
    return Promise.reject(Error('ffmpeg.js -> toAudio -> file does not exist'));
  }

  var internal, perct;
  // attaching abort to the external listener
  if (listener) {
    Object.defineProperty(listener, 'abort', {
      get: function () {
        return internal.abort || listener.abort || function () {};
      }
    });
  }
  if (listener && listener.progress) {
    perct = new percentage(listener.progress);
    internal = {stderr: perct.step};
  }

  if (!output) {
    var ext = getExtension(input).toLowerCase();
    switch (ext) {
    case 'webm':
    case 'ogg':
      output = input.replace('.' + ext, '.ogg');
      break;
    case 'mp4':
    case 'm4a':
      output = input.replace('.' + ext, '.m4a');
      break;
    default:
      return Promise.reject(Error('ffmpeg.js -> toAudio -> could not predict the output format'));
    }
  }
  output = output.replace(' - DASH', '');
  output = utils.file.checkDuplicate(output);

  var args = utils.prefs.toAudio.split(/\s+/).map(function (s) {
    return s.replace('%input', input)
      .replace('%output', output);
  });
  return new execute(args, internal)
  .then(function (result) {
    if (result.exitCode === 0) {
      return true;
    }
    var stderr = perct ? perct.data : result.stderr;
    var tmp = knownErrors(stderr);
    throw Error(tmp ? 'ffmpeg.js -> toAudio -> ' + tmp : 'check error console for the complete error report');
  });
};

exports.toCombined = function (audio, video, output, listener) {
  if (!utils.file.exists(audio)) {
    return Promise.reject(Error('ffmpeg.js -> toCombined -> audio file does not exist'));
  }
  if (!utils.file.exists(video)) {
    return Promise.reject(Error('ffmpeg.js -> toCombined -> video file does not exist'));
  }

  var internal, perct;
  // attaching abort to the external listener
  if (listener) {
    Object.defineProperty(listener, 'abort', {
      get: function () {
        return internal.abort || listener.abort || function (){};
      }
    });
  }
  if (listener && listener.progress) {
    perct = new percentage(listener.progress);
    internal = {stderr: perct.step};
  }

  output = output || video;
  // output has extension?
  var tmp = /\%output\.([^\s]*)/.exec(utils.prefs.toCombined);
  var ext = getExtension(output);
  if (tmp && tmp.length) {
    output = output.replace('.' + ext, '') + '.' + tmp[1];
  }
  output = output.replace(' - DASH', '');
  output = utils.file.checkDuplicate(output);

  var args = utils.prefs.toCombined.split(/\s+/).map(function (s) {
    return s.replace('%audio', audio)
      .replace('%video', video)
      .replace(/\%output[\.\w]*/, output);
  });
  return new execute(args, internal)
  .then(function (result) {
    if (result.exitCode === 0) {
      return true;
    }
    var stderr = perct ? perct.data : result.stderr;
    var tmp = knownErrors(stderr);
    throw Error(tmp ? 'ffmpeg.js -> toCombined -> ' + tmp : 'check error console for the complete error report');
  });
};

exports.volume = function (input, output, level = 1, listener) {
  if (!utils.file.exists(input)) {
    return Promise.reject(Error('ffmpeg.js -> volume -> file does not exist'));
  }

  var internal, perct;
  // attaching abort to the external listener
  if (listener) {
    Object.defineProperty(listener, 'abort', {
      get: function () {
        return internal.abort || listener.abort || function () {};
      }
    });
  }
  if (listener && listener.progress) {
    perct = new percentage(listener.progress);
    internal = {stderr: perct.step};
  }

  output = output || input;
  output = utils.file.checkDuplicate(output);

  var args = utils.prefs.volume.split(/\s+/).map(function (s) {
    return s.replace('%input', input)
      .replace(/\%output[\.\w]*/, output)
      .replace('%level', level);
  });
  return new execute(args, internal)
  .then(function (result) {
    if (result.exitCode === 0) {
      return true;
    }
    var stderr = perct ? perct.data : result.stderr;
    var tmp = knownErrors(stderr);
    throw Error(tmp ? 'ffmpeg.js -> volume -> ' + tmp : 'check error console for the complete error report');
  });
};

exports.scale = function (input, output, divide = 1, multiply = 1, listener) {
  if (!utils.file.exists(input)) {
    return Promise.reject(Error('ffmpeg.js -> scale -> file does not exist'));
  }

  var internal, perct;
  // attaching abort to the external listener
  if (listener) {
    Object.defineProperty(listener, 'abort', {
      get: function () {
        return internal.abort || listener.abort || function () {};
      }
    });
  }
  if (listener && listener.progress) {
    perct = new percentage(listener.progress);
    internal = {stderr: perct.step};
  }

  output = output || input;
  output = utils.file.checkDuplicate(output);

  var args = utils.prefs.scale.split(/\s+/).map(function (s) {
    return s.replace('%input', input)
      .replace(/\%output[\.\w]*/, output)
      .replace('%divide', divide)
      .replace('%multiply', multiply);
  });
  return new execute(args, internal)
  .then(function (result) {
    if (result.exitCode === 0) {
      return true;
    }
    var stderr = perct ? perct.data : result.stderr;
    var tmp = knownErrors(stderr);
    throw Error(tmp ? 'ffmpeg.js -> scale -> ' + tmp : 'check error console for the complete error report');
  });
};
