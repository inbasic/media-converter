'use strict';

var converter = {};

chrome.storage.local.get('version', (obj) => {
  let version = chrome.runtime.getManifest().version;
  if (obj.version !== version) {
    window.setTimeout(() => {
      chrome.storage.local.set({version}, () => {
        chrome.tabs.create({
          url: 'http://add0n.com/media-converter.html?version=' +
            version + '&type=' +
            (obj.version ? ('upgrade&p=' + obj.version) : 'install')
        });
      });
    }, 3000);
  }
});

function open () {
  let screenWidth = screen.availWidth;
  let screenHeight = screen.availHeight;
  chrome.storage.local.get({
    width: 700,
    height: 600
  }, prefs => {
    function create () {
      chrome.windows.create({
        url: chrome.extension.getURL('data/converter/index.html'),
        width: prefs.width,
        height: prefs.height,
        left: Math.round((screenWidth - prefs.width) / 2),
        top: Math.round((screenHeight - prefs.height) / 2),
        type: 'popup'
      }, w => converter = w);
    }
    if (converter.id) {
      chrome.windows.get(converter.id, w => {
        chrome.runtime.lastError;
        if (w) {
          chrome.windows.update(converter.id, {focused: true});
        }
        else {
          create();
        }
      });
    }
    else {
      create();
    }
  });
}
chrome.browserAction.onClicked.addListener(open);

chrome.runtime.onMessageExternal.addListener((request, sender, response) => {
  if (request.method === 'open') {
    open();
    response(true);
  }
});
