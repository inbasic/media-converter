document.getElementById('mode').addEventListener('change', e => chrome.storage.local.set({
  mode: e.target.value
}, () => location.reload()));

document.getElementById('wasm').onclick = () => chrome.storage.local.set({
  mode: 'wasm'
}, () => location.reload());

document.getElementById('permission').onclick = () => chrome.permissions.request({
  permissions: ['nativeMessaging', 'downloads'],
  origins: ['http://127.0.0.1/']
}, () => {
  const e = chrome.runtime.lastError;

  if (e) {
    alert(e.message);
  }
  location.reload();
});

chrome.permissions.contains({
  permissions: ['nativeMessaging', 'downloads']
}, granted => {
  if (granted) {
    document.getElementById('permission').parentElement.remove();
  }
});

chrome.runtime.onMessage.addListener((request, sender, response) => {
  if (request.method === 'is-open') {
    response(true);
    chrome.runtime.sendMessage({
      method: 'focus'
    });
  }
});
