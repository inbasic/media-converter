/* globals EventEmitter */
'use strict';

var restore = new EventEmitter();

document.addEventListener('change', e => {
  const target = e.target;
  if (target.dataset.restore) {
    chrome.storage.local.set({
      'session-restore': [...document.querySelectorAll('[data-restore]')].map(e => {
        if (e.type === 'checkbox' || e.type === 'radio') {
          return {
            id: e.dataset.restore,
            value: e.checked
          };
        }
        return {
          id: e.dataset.restore,
          value: e.value
        };
      })
    });
  }
});

restore.on('restore', callback => {
  chrome.storage.local.get({
    'session-restore': []
  }, prefs => {
    prefs['session-restore'].forEach(o => {
      const element = document.querySelector(`[data-restore="${o.id}"]`);
      if (element) {
        element[typeof o.value === 'boolean' ? 'checked' : 'value'] = o.value;
        element.dispatchEvent(new Event('change', {bubbles: true}));
      }
    });
    callback();
  });
});
