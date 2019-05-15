'use strict';

var converter = {};

function open() {
  const {availWidth, availHeight} = screen;
  chrome.storage.local.get({
    width: 700,
    height: 600
  }, prefs => {
    function create() {
      chrome.windows.create({
        url: chrome.extension.getURL('data/converter/index.html'),
        width: prefs.width,
        height: prefs.height,
        left: Math.round((availWidth - prefs.width) / 2),
        top: Math.round((availHeight - prefs.height) / 2),
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

// FAQs & Feedback
{
  const {onInstalled, setUninstallURL, getManifest} = chrome.runtime;
  const {name, version} = getManifest();
  const page = getManifest().homepage_url;
  onInstalled.addListener(({reason, previousVersion}) => {
    chrome.storage.local.get({
      'faqs': true,
      'last-update': 0
    }, prefs => {
      if (reason === 'install' || (prefs.faqs && reason === 'update')) {
        const doUpdate = (Date.now() - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
        if (doUpdate && previousVersion !== version) {
          chrome.tabs.create({
            url: page + '?version=' + version +
              (previousVersion ? '&p=' + previousVersion : '') +
              '&type=' + reason,
            active: reason === 'install'
          });
          chrome.storage.local.set({'last-update': Date.now()});
        }
      }
    });
  });
  setUninstallURL(page + '?rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
}
