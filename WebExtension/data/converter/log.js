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
log.on('error', log.generate.bind(log, 'error'));
