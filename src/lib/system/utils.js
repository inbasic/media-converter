'use strict';

var {Cc, Ci, Cu}             = require('chrome'),
    {emit, on, off}          = require('sdk/event/core'),
    {Hotkey}                 = require('sdk/hotkeys'),
    {env}                    = require('sdk/system/environment'),
    timer                    = require('sdk/timers'),
    unload                   = require('sdk/system/unload'),
    tabs                     = require('sdk/tabs'),
    self                     = require('sdk/self'),
    data                     = self.data,
    windowUtils              = require('sdk/window/utils'),
    Request                  = require('sdk/request').Request,
    prefService              = require('sdk/preferences/service'),
    sp                       = require('sdk/simple-prefs'),
    prefs                    = sp.prefs,
    l10n                     = require('sdk/l10n').get,
    notifications            = require('sdk/notifications'),
    child_process            = require('sdk/system/child_process'),
    config                   = require('../config'),
    {all, defer, race, resolve, reject}  = require('sdk/core/promise'),
    hiddenWindow             = Cc['@mozilla.org/appshell/appShellService;1']
      .getService(Ci.nsIAppShellService)
      .hiddenDOMWindow;

var {XPCOMUtils} = Cu.import('resource://gre/modules/XPCOMUtils.jsm');

/* Promise */
exports.Promise = function (callback) {
  let d = defer();
  callback(d.resolve, d.reject);
  return d.promise;
};
exports.Promise.defer = defer;
exports.Promise.all = all;
exports.Promise.race = race;
exports.Promise.resolve = resolve;
exports.Promise.reject = reject;
/* XPCOMUtils */
exports.XPCOMUtils = XPCOMUtils;
/* Hotkey */
exports.Hotkey = Hotkey;
/* l10n */
exports.l10n = l10n;
/* env */
exports.env = env;
/* Request */
exports.Request = Request;
/* unload */
exports.unload = unload;
/* timer */
exports.timer = timer;
/* subprocess */
exports.child_process = child_process;
/* manifest */
exports.manifest = self;
/* import */
exports['import'] = function (path, obj) {
  Cu.import(data.url(path), obj);
};
/* event */
exports.event = function (obj) {
  obj = obj || {};
  obj.on = on.bind(null, obj);
  obj.emit = emit.bind(null, obj);
  obj.off = off.bind(null, obj);

  return obj;
};
var exportsHelper = {};

/* root */
XPCOMUtils.defineLazyGetter(exportsHelper, 'root', function () {
  let nsIXULRuntime = Cc['@mozilla.org/xre/app-info;1'].getService(Ci.nsIXULRuntime);

  return {
    os: nsIXULRuntime.OS,
    arch: nsIXULRuntime.is64Bit ? 'x64' : 'ia32'
  };
});
Object.defineProperty(exports, 'root', {
  get: function () {
    return exportsHelper.root;
  }
});

/* Windows */
var windows = {
  open: function (path, name) {
    let win = Cc['@mozilla.org/embedcomp/window-watcher;1']
      .getService(Ci.nsIWindowWatcher)
      .openWindow(null, path, name || 'unknown', 'chrome,centerscreen,resizable=yes', null);
    unload.when(function () {
      if (win) {
        win.close();
      }
    });
    return win;
  },
  openHome: (extra) => tabs.open(config.urls.homepage + (extra ? '?' + extra : '')),
  openOptions: () => windowUtils.getMostRecentBrowserWindow().BrowserOpenAddonsMgr('addons://detail/' + encodeURIComponent(self.id)),
  getActive: () => windowUtils.getMostRecentBrowserWindow()
};
exports.windows = windows;
/* preferences */
exports.prefs = prefs;
exports.reset = (name) => prefService.reset(['extensions', self.id, name].join('.'));
/* file */
XPCOMUtils.defineLazyGetter(exportsHelper, 'file', function () {
  let {FileUtils} = Cu.import('resource://gre/modules/FileUtils.jsm');
  function toFile (path) {
    return new FileUtils.File(path);
  }
  return {
    exists: (path) => (typeof(path) === 'string' ?  toFile(path) : path).exists(),
    checkDuplicate: function (path) {
      let file = toFile(path);
      file.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE, FileUtils.PERMS_FILE);
      if (path !== file.path) {
        file.remove(false);
      }
      return file.path;
    },
    browse: function (title, mode) {
      let fp = Cc['@mozilla.org/filepicker;1'].createInstance(Ci.nsIFilePicker);
      fp.init(hiddenWindow, title, mode === 'save' ? Ci.nsIFilePicker.modeSave : Ci.nsIFilePicker.modeOpen);
      let rv = fp.show();
      if (rv === Ci.nsIFilePicker.returnOK || rv === Ci.nsIFilePicker.returnReplace) {
        return fp.file;
      }
      return null;
    },
    absolutePath: function (path) {
      try {
        return toFile(path);
      }
      catch (e) {
        return;
      }
    },
    relativePath: (a, b) => FileUtils.getFile(a, b),
    nsIFile: Ci.nsIFile
  };
});
Object.defineProperty(exports, 'file', {
  get: function () {
    return exportsHelper.file;
  }
});

/* notification */
exports.notify = function (title, text, iconURL) {
  notifications.notify({
    title,
    text,
    iconURL: iconURL || data.url('images/notification-desktop.png')
  });
};
