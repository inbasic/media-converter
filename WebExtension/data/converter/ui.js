/* globals element, ffmpeg, os */
'use strict';

var os = navigator.userAgent.indexOf('Mac') !== -1 ? 'mac' : (
  navigator.userAgent.indexOf('Linux') !== -1 ? 'linux' : 'windows'
);

document.documentElement.dataset.platform = os;

document.addEventListener('change', e => {
  const target = e.target;
  const id = target.dataset.for;
  // tabs
  if (id && !target.disabled && target.checked) {
    const panel = document.getElementById(id);
    element.panels.list.filter(e => e !== panel).forEach(e => e.dataset.selected = false);
    panel.dataset.selected = true;
  }
  // range
  if (target.type === 'range') {
    target.parentNode.querySelector('span').textContent = target.value + (target.dataset.append || '');
  }
  // samples
  if (target.dataset.cmd === 'fill-sample-values') {
    const [vbr = '', vtr = '', abr = ''] = target.value.split(',');
    console.error(target.value);
    element.custom.output.audio.rate = abr;
    element.custom.output.video.rate = vbr;
    element.custom.output.video.tolerance = vtr;
  }
});
// user preferences
document.addEventListener('keyup', ({target}) => {
  const pref = target.dataset.pref;
  if (pref) {
    target.parentNode.querySelector('[type=button]').disabled = target.value === target.dataset.value;
  }
});
document.addEventListener('click', ({target}) => {
  const cmd = target.dataset.cmd;
  if (cmd === 'save-preference') {
    const input = target.parentNode.querySelector('[type=text]');
    const pref = input.dataset.pref;
    chrome.storage.local.set({
      [pref]: input.value
    }, () => {
      input.dataset.value = input.value;
      input.dispatchEvent(new Event('keyup', {bubbles: true}));
      ffmpeg.emit(pref + '-changed', input.value);
    });
  }
  else if (cmd === 'restart') {
    window.location.reload();
  }
  else if (cmd === 'download-native') {
    element.instruction.parent.dataset.working = true;
    const req = new window.XMLHttpRequest();
    req.open('GET', 'https://api.github.com/repos/andy-portmen/native-client/releases/latest');
    req.responseType = 'json';
    req.onload = () => {
      try {
        chrome.downloads.download({
          url: req.response.assets.filter(a => a.name === os + '.zip')[0].browser_download_url,
          filename: os + '.zip'
        }, () => {
          element.instruction.step1.style = 'text-decoration: line-through;';
          element.instruction.parent.dataset.working = false;
        });
      }
      catch (e) {
        window.alert(e.message || e);
      }
    };
    req.onerror = () => {
      window.alert('Something went wrong! Please download the package manually');
      window.setTimeout(() => {
        window.open('https://github.com/andy-portmen/native-client/releases');
      }, 5000);
    };
    req.send();
  }
  else if (cmd === 'update-native-client') {
    document.body.dataset.instruction = true;
  }
  else if (cmd === 'update-ffmpeg') {
    document.body.dataset.working = true;
    element.busy.parent.dataset.working = true;
    ffmpeg.download().then(path => {
      element.busy.parent.dataset.working = false;
      document.body.dataset.working = false;
      return path;
    });
  }
  else if (cmd === 'reset-custom') {
    element.custom.input.audio.rate = '';
    element.custom.input.audio.channels = '';
    element.custom.input.video.rate = '';
    element.custom.output.format = 'mp4';
    element.custom.output.video.size = '';
    element.custom.output.video.rate = '';
    element.custom.output.video.tolerance = '';
    element.custom.output.audio.rate = '';
  }
});
//resize
(function(id) {
  function resize() {
    chrome.storage.local.set({
      width: window.outerWidth,
      height: window.outerHeight
    });
  }
  function check() {
    window.clearTimeout(id);
    id = window.setTimeout(resize, 1000);
  }

  window.addEventListener('resize', check);
})();
