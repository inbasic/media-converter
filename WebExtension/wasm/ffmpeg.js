/* global NFFmpeg, ffmpeg */

class WFFmpeg extends NFFmpeg {
  async run(...args) {
    this.iframe.contentWindow.postMessage({
      method: 'run',
      args
    });
  }
  read(file) {
    return new Promise(resolve => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.readAsArrayBuffer(file);
    });
  }
  async init() {
    return {
      version: 'v.0.10.0 (WASM)',
      savein: '',
      tmpdir: '',
      port: ''
    };
  }
  async createUnique(root, name, extension, job) {
    let filename = name + '.' + extension;
    const filenames = job.files.map(f => f.name);

    let index = 1;
    while (filenames.indexOf(filename) !== -1) {
      filename = name + '-' + index + '.' + extension;
      index += 1;
    }
    return filename;
  }
  async cleanup() {
    this.iframe.remove();
    delete this.iframe;
  }
  async send(file) {
    if (!this.iframe) {
      await new Promise(resolve => {
        const iframe = this.iframe = document.createElement('iframe');
        iframe.src = '/wasm/instance.html';
        iframe.onload = resolve;
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
      });
    }
    this.iframe.contentWindow.postMessage({
      method: 'input-file',
      name: file.name,
      buffer: await this.read(file)
    }, '*');

    await new Promise(resolve => {
      this.send.resolve = resolve;
    });

    return file.name;
  }
  async find() {
    return '';
  }
  async server() {
    return;
  }
  onDisconnect() {}
}

window.addEventListener('message', async e => {
  const request = e.data;
  if (request.method === 'terminate') {
    await ffmpeg.cleanup();
    await new Promise(resolve => setTimeout(resolve, 2000));
    ffmpeg.busy = false;
    ffmpeg.counter();
    ffmpeg.convert();
    ffmpeg.log('warning', 'Done!');
  }
  else if (request.method === 'stdout') {
    ffmpeg.log('info', request.msg);
  }
  else if (request.method === 'stderr') {
    ffmpeg.log('error', request.msg);
  }
});
