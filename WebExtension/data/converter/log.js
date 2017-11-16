/* globals element, EventEmitter */
'use strict';

var log = new EventEmitter();
log.generate = (type, msg) => {
  const div = document.createElement('div');
  div.dataset.type = type;
  const time = document.createElement('span');
  time.textContent = (new Date()).toLocaleTimeString();
  div.appendChild(time);
  const body = document.createElement('span');
  body.textContent = msg;
  div.appendChild(body);
  element.log.parent.appendChild(div);
  div.scrollIntoView(false);
};
log.clean = () => {
  element.log.parent.textContent = '';
};
log.on('clean', log.clean.bind(log));
log.on('info', log.generate.bind(log, 'info'));
log.on('warning', log.generate.bind(log, 'warning'));
log.on('error', msg => {
  log.generate('error', msg);
  if (msg.indexOf('ENOENT') !== -1 && msg.indexOf('spawn') !== -1) {
    window.alert(`FFmpeg executable is damaged. Please replace the "FFmpeg Location" with a new executable path.

You can update FFmpeg executable either from the "Settings" tab or manually from https://www.ffmpeg.org/download.html`);
    element.tabs.list.pop().click();
  }
  else if (msg.indexOf('ENOENT') !== -1) {
    window.alert('The destination directory is unreachable. Please use another path for "Save Files In" field');
    element.tabs.list.pop().click();
  }
  else if (msg.indexOf('Error in transferring data') !== -1) {
    window.alert(`There is a problem storing your media file in a temporary directory.

Is "Temporary Directory" field set to a reachable local directory?`);
    element.tabs.list.pop().click();
  }
});
