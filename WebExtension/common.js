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
chrome.storage.local.get({
  'version': null,
  'faqs': true,
  'last-update': 0
}, prefs => {
  const version = chrome.runtime.getManifest().version;

  if (prefs.version ? (prefs.faqs && prefs.version !== version) : true) {
    const now = Date.now();
    const doUpdate = (now - prefs['last-update']) / 1000 / 60 / 60 / 24 > 30;
    chrome.storage.local.set({
      version,
      'last-update': doUpdate ? Date.now() : prefs['last-update']
    }, () => {
      // do not display the FAQs page if last-update occurred less than 30 days ago.
      if (doUpdate) {
        const p = Boolean(prefs.version);
        chrome.tabs.create({
          url: chrome.runtime.getManifest().homepage_url + '?version=' + version +
            '&type=' + (p ? ('upgrade&p=' + prefs.version) : 'install'),
          active: p === false
        });
      }
    });
  }
});

{
  const {name, version} = chrome.runtime.getManifest();
  chrome.runtime.setUninstallURL(
    chrome.runtime.getManifest().homepage_url + '?rd=feedback&name=' + name + '&version=' + version
  );
}
