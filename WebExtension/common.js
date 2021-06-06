'use strict';

const ports = new Set();
chrome.runtime.onConnect.addListener(port => {
  ports.add(port);
  port.onDisconnect.addListener(() => ports.delete(port));
});

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
      });
    }
    if (ports.size) {
      const port = ports.values().next().value;
      const tab = port.sender.tab;
      chrome.windows.update(tab.windowId, {focused: true});
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

/* FAQs & Feedback */
{
  const {management, runtime: {onInstalled, setUninstallURL, getManifest}, storage, tabs} = chrome;
  if (navigator.webdriver !== true) {
    const page = getManifest().homepage_url;
    const {name, version} = getManifest();
    onInstalled.addListener(({reason, previousVersion}) => {
      management.getSelf(({installType}) => installType === 'normal' && storage.local.get({
        'faqs': true,
        'last-update': 0
      }, prefs => {
        if (reason === 'install' || (prefs.faqs && reason === 'update')) {
          const doUpdate = (Date.now() - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
          if (doUpdate && previousVersion !== version) {
            tabs.query({active: true, currentWindow: true}, tbs => tabs.create({
              url: page + '?version=' + version + (previousVersion ? '&p=' + previousVersion : '') + '&type=' + reason,
              active: reason === 'install',
              ...(tbs && tbs.length && {index: tbs[0].index + 1})
            }));
            storage.local.set({'last-update': Date.now()});
          }
        }
      }));
    });
    setUninstallURL(page + '?rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
  }
}
