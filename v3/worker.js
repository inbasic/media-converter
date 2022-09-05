'use strict';

const open = () => chrome.runtime.sendMessage({
  method: 'is-open'
}, r => {
  chrome.runtime.lastError;
  if (r !== true) {
    chrome.storage.local.get({
      width: 800,
      height: 800
    }, async prefs => {
      const win = await chrome.windows.getCurrent();
      chrome.windows.create({
        url: '/data/converter/index.html',
        width: prefs.width,
        height: prefs.height,
        left: Math.round((win.width - prefs.width) / 2),
        top: Math.round((win.height - prefs.height) / 2),
        type: 'popup'
      });
    });
  }
});
chrome.action.onClicked.addListener(open);

chrome.runtime.onMessageExternal.addListener((request, sender, response) => {
  if (request.method === 'open') {
    open();
    response(true);
  }
  else if (request.method === 'focus') {
    chrome.windows.update(sender.tab.windowId, {
      focused: true
    });
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
