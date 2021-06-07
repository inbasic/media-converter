/* global createFFmpegCore */
let Core;
let ffmpeg;
let filename;

const parse = args => {
  const argsPtr = Core._malloc(args.length * Uint32Array.BYTES_PER_ELEMENT);
  args.forEach((s, idx) => {
    const buf = Core._malloc(s.length + 1);
    Core.writeAsciiToMemory(s, buf);
    Core.setValue(argsPtr + (Uint32Array.BYTES_PER_ELEMENT * idx), buf, 'i32');
  });
  return [args.length, argsPtr];
};

const s = createFFmpegCore({
  mainScriptUrlOrBlob: '/wasm/ffmpeg/ffmpeg-core.js',
  printErr(msg) {
    parent.postMessage({
      method: 'stderr',
      msg
    }, '*');
  },
  print(msg) {
    if (msg === 'FFMPEG_END') {
      const output = Core.FS.readFile(filename);
      const blob = new Blob([output], {
        type: 'audio/mp3'
      });
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = filename;
      a.click();

      try {
        Core.exit(0);
      }
      catch (e) {}
      Core = null;
      ffmpeg = null;

      parent.postMessage({
        method: 'terminate'
      }, '*');
    }
    if (msg !== 'FFMPEG_ENDFFMPEG_END' && msg !== 'FFMPEG_END') {
      parent.postMessage({
        method: 'stdout',
        msg
      });
    }
  },
  locateFile(path, prefix) {
    return prefix + path;
  }
}).then(C => {
  Core = C;
});


window.addEventListener('message', async e => {
  const request = e.data;
  if (request.method === 'run') {
    filename = request.args[request.args.length - 1];
    ffmpeg = Core.cwrap('proxy_main', 'number', ['number', 'number']);
    ffmpeg(...parse(request.args));
  }
  else if (request.method === 'input-file') {
    await s;
    Core.FS.writeFile(request.name, new Uint8Array(request.buffer));
    parent.ffmpeg.send.resolve();
  }
});
