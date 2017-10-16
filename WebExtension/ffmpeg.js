/* globals Native, vCompare, ffmpeg */
'use strict';

var FFmpeg = function(path) {
  Native.call(this);
  this.callbacks = [];
  this.jobs = [];
  this.busy = false;
  this.callback = null;
  this.key = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : r & 0x3 | 0x8;
    return v.toString(16);
  });
  this.config = {
    port: path.port,
    native: {},
    ffmpeg: {
      path: path.ffmpeg
    },
    user: {
      savein: path.savein,
      tmpdir: path.tmpdir
    }
  };
  this.log = function() {
    console.error.apply(console, arguments);
  };
  this.log = function() {
    console.error('number of active jobs', this.config.queue);
  };
  this.onMessage(response => {
    if (this.callback) {
      this.callback(response);
      this.callback = null;
    }
    else {
      if (response.stdout && response.stdout.type === 'Buffer') {
        this.log('info', String.fromCharCode.apply(String, response.stdout.data));
      }
      else if (response.stderr && response.stderr.type === 'Buffer') {
        this.log('error', String.fromCharCode.apply(String, response.stderr.data));
      }
      else if (response.code === 0) {
        this.log('warning', 'Done!');
      }
      else if (response.code) {
        this.log('error', 'Something went wrong; ' + JSON.stringify(response));
      }
      else {
        this.log('warning', JSON.stringify(response));
      }
    }
    //
    if ('code' in response) {
      if (this.busy && response.cmd === 'spawn') {
        this.cleanup().then(() => {
          this.busy = false;
          this.counter();
          this.convert();
        });
      }
      else {
        this.convert();
      }
    }
  });
};
FFmpeg.prototype = Object.create(Native.prototype);

FFmpeg.prototype.on = function(id, callback) {
  this.callbacks[id] = this.callbacks[id] || [];
  this.callbacks[id].push(callback);
};
FFmpeg.prototype.emit = function(id, value) {
  (this.callbacks[id] || []).forEach(c => c(value));
};

FFmpeg.prototype.convert = function() {
  return new Promise((resolve, reject) => {
    if (this.jobs.length && !this.busy) {
      this.busy = true;
      this.counter();
      const job = this.jobs.shift();
      let name = job.files[0].name;
      let extension = name.split('.').pop();
      name = name.replace('.' + extension, '');
      name = name.replace('- DASH', '');

      const args = [];
      if (job.mode === 'mp3' && job.recipe.quality === 'variable') {
        args.push('-qscale:a', job.recipe.bitrate);
        extension = 'mp3';
      }
      else if (job.mode === 'mp3' && job.recipe.quality === 'constant') {
        args.push('-b:a', job.recipe.bitrate);
        extension = 'mp3';
      }
      else if (job.mode === 'extract') {
        args.push('-acodec', 'copy', '-vn');
        switch (extension) {
          case 'weba':
          case 'webm':
          case 'ogg':
          case 'vorbis':
            extension = 'ogg';
            break;
          case 'mp4':
          case 'm4a':
            extension = 'm4a';
            break;
          default:
            extension = 'mka'; // "MKA" container format can store a huge number of audio codecs.
        }
      }
      else if (job.mode === 'muxer') {
        /* find video's extension */
        extension = job.files
          .map(f => f.name.split('.').pop())
          .filter(e => e === 'mp4' || e === 'webm')
          .pop() || extension;
        args.push('-c', 'copy');
      }
      else if (job.mode === 'volume') {
        args.push('-af', `volume=${job.recipe.volume / 100}`);
      }
      else if (job.mode === 'scale') {
        args.push('-vf', `scale=iw*${job.recipe.multiply}/${job.recipe.divide}:-1`);
      }
      else if (job.mode === 'rotate') {
        if (job.recipe.angle === '-1') {
          args.push('-vf', 'transpose=2,transpose=2');
        }
        else {
          args.push('-vf', 'transpose=' + job.recipe.angle);
        }
      }
      else if (job.mode === 'shift') {
        if (job.type === 'video') {
          args.push('-map', '0:a', '-map', '1:v', '-c', 'copy');
        }
        else {
          args.push('-map', '0:v', '-map', '1:a', '-c', 'copy');
        }
      }
      else if (job.mode === 'cut') {
        if (job.recipe.start) {
          args.push('-ss', job.recipe.start);
        }
        if (job.recipe.end) {
          args.push('-to', job.recipe.end);
        }
      }
      else if (job.mode === 'custom') {
        if (job.recipe.input.audio.channels) {
          args.push('-ac', job.recipe.input.audio.channels);
        }
        if (job.recipe.input.audio.rate) {
          args.push('-ar', job.recipe.input.audio.rate);
        }
        if (job.recipe.input.video.rate) {
          args.push('-r', job.recipe.input.video.rate);
        }
        extension = job.recipe.output.format;
        if (job.recipe.output.audio.rate) {
          args.push('-ab', job.recipe.output.audio.rate);
        }
        if (job.recipe.output.video.rate) {
          args.push('-b', job.recipe.output.video.rate);
        }
        if (job.recipe.output.video.tolerance) {
          args.push('-bt', job.recipe.output.video.tolerance);
        }
        if (job.recipe.output.video.size) {
          args.push('-s', job.recipe.output.video.size);
          const [width, height] = job.recipe.output.video.size.split('x');
          args.push('-aspect', width + ':' + height);
        }
      }

      return this.createUnique(this.config.user.savein, name, extension).then(output => {
        args.push(output);

        return Promise.all(job.files.map(file => this.send(file)))
        .then(files => {
          if (job.mode === 'shift') {
            args.unshift('-itsoffset', job.recipe.time, '-i', files[0]);
          }
          files.forEach(file => args.unshift('-i', file));
          args.unshift('-hide_banner', '-nostdin');

          this.log('warning', 'Command-line options: ' + args.join(', '));
          this.spawn(this.config.ffmpeg.path, args);
        });
      }).catch(reject);
    }
    else {
      resolve();
    }
  });
};

FFmpeg.prototype.find = function() {
  return new Promise((resolve, reject) => {
    this.callback = function(r) {
      if (r && r.code === 0) {
        const path = r.stdout.trim();
        this.config.ffmpeg.path = path;
        resolve(path);
      }
      else {
        reject(new Error(r.stderr || `I am not able to find FFmpeg executable; code=${r.code}`));
      }
    };
    if (this.platform === 'Windows') {
      this.exec('where', ['ffmpeg.exe'], [this.config.user.home]);
    }
    else {
      this.exec('which', ['ffmpeg'], ['/usr/local/bin', this.config.user.home]);
    }
  });
};

FFmpeg.prototype.createUnique = function(root, name, extension) {
  return new Promise((resolve, reject) => {
    function check(files, name, extension, index = 0) {
      const leafname = name.replace(/-\d+$/, '') + (index ? '-' + index : '') + '.' + extension;
      for (const n of files) {
        if (n.endsWith(leafname)) {
          return check(files, name, extension, index + 1);
        }
      }
      return leafname;
    }

    this.callback = function(obj) {
      if (obj.error) {
        reject(new Error(obj.error));
      }
      else {
        resolve(root + obj.separator + check(obj.files, name, extension));
      }
    };
    this.dir(root);
  });
};

FFmpeg.prototype.init = function() {
  return new Promise((resolve, reject) => {
    const me = this;
    this.callback = function(response) {
      if (response) {
        me.config.native.version = response.version;
        me.config.user.home = (response.env.HOME || response.env.USERPROFILE);
        me.config.user.separator = response.separator;
        let savein = me.config.user.home + response.separator + 'Desktop';
        me.config.user._savein = savein;
        savein = me.config.user.savein || savein;
        me.config.user.savein = savein;
        let tmpdir = response.tmpdir;
        me.config.user._tmpdir = tmpdir;
        tmpdir = me.config.user.tmpdir || tmpdir;
        me.config.user.tmpdir = tmpdir;

        resolve({
          version: response.version,
          savein,
          tmpdir,
          port: me.config.port
        });
      }
      else {
        reject(new Error('Cannot communicate with the native client'));
      }
    };
    this.spec();
  });
};

FFmpeg.prototype.download = function() {
  function download(filename, url) {
    return new Promise((resolve, reject) => {
      chrome.downloads.download({url, filename}, id => {
        function observe(d) {
          if (d.id === id && d.state) {
            if (d.state.current === 'complete' || d.state.current === 'interrupted') {
              chrome.downloads.onChanged.removeListener(observe);
              if (d.state.current === 'complete') {
                chrome.downloads.search({id}, ([d]) => {
                  if (d) {
                    resolve(d);
                  }
                  else {
                    reject('I am not able to find the downloaded file!');
                  }
                });
              }
              else {
                reject('The downloading job got interrupted');
              }
            }
          }
        }
        chrome.downloads.onChanged.addListener(observe);
      });
    });
  }

  return new Promise((resolve, reject) => {
    this.callback = function(obj) {
      if (obj.code === 0) {
        this.config.ffmpeg.path = obj.target;
        resolve(obj.target);
      }
      else {
        reject(obj.error);
      }
    };
    let name = 'ffmpeg-';
    const platform = navigator.platform;
    if (platform === 'Win32') {
      name += 'win32-ia32.exe';
    }
    else if (platform === 'Win64') {
      name += 'win32-x64.exe';
    }
    else if (platform === 'MacIntel') {
      name += 'darwin-x64';
    }
    else if (platform.indexOf('64')) {
      name += 'linux-x64';
    }
    else {
      name += 'linux-ia32';
    }
    const req = new window.XMLHttpRequest();
    req.open('GET', 'https://api.github.com/repos/inbasic/ffmpeg/releases/latest');
    req.responseType = 'json';
    req.onload = () => {
      const assests = req.response.assets.filter(o => o.name === name);
      if (assests.length) {
        const filename = navigator.platform.startsWith('Win') ? 'ffmpeg.exe' : 'ffmpeg';
        const url = assests[0].browser_download_url;
        download(filename, url).then(d => this.cut({
          source: d.filename,
          target: this.config.user.home +
            this.config.user.separator + filename,
          chmod: '0777',
          delete: true
        })).catch(reject);
      }
      else {
        reject('Cannot find ' + name + ' in the list. Please download and install FFmpeg manually.');
      }
    };
    req.onerror = reject;
    req.send();
  });
};

FFmpeg.prototype.server = function() {
  return new Promise((resolve, reject) => {
    this.callback = function(res) {
      if (res.code === 0) {
        resolve();
      }
      else {
        reject(new Error('Cannot create server at this port; ' + res.error));
      }
    };
    this.ifup(this.config.port, this.key);
  });
};

FFmpeg.prototype.send = function(file) {
  const path = this.config.user.tmpdir + this.config.user.separator + parseInt(Math.random() * 1000) + '_' + file.name;
  this.log('info', 'Saving a temp file in ' + path);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const r = new window.XMLHttpRequest();
      r.responseType = 'text';
      r.onload = () => {
        if (r.status === 200) {
          resolve(path);
        }
        else {
          reject(new Error('Error in transferring data; ' + r.statusText));
        }
      };
      r.onerror = e => {
        console.error(e);
        reject(new Error('Error in transferring data; ' + e.message));
      };
      r.open('PUT', 'http://127.0.0.1:' + this.config.port);
      // check for non-ASCII characters
      if (!/^[ -~]+$/.test(path)) {
        if (vCompare('0.3.1', ffmpeg.config.native.version) > 0) {
          return reject(new Error(
            'Support for non-ASCII characters in file-name is introduced in native-client v0.3.1. ' +
            'Please update your native client or rename the files and try again.'
          ));
        }
        r.setRequestHeader('file-path', 'enc:' + window.encodeURIComponent(path));
      }
      else {
        r.setRequestHeader('file-path', path);
      }

      r.setRequestHeader('api-key', this.key);
      r.send(reader.result);
    };
    reader.onerror = e => reject(e);
    reader.readAsArrayBuffer(file);
  });
};

FFmpeg.prototype.cleanup = function() {
  return new Promise((resolve, reject) => {
    this.callback = function(res) {
      if (res.code === 0) {
        resolve();
      }
      else {
        reject(new Error(res.error));
      }
    };
    this['clean-tmp']();
  });
};
