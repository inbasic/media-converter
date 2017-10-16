'use strict';

var utils = require('./utils'),
    {Cu}  = require('chrome');

var exportsHelper = {};
utils.XPCOMUtils.defineLazyGetter(exportsHelper, 'get', function () {
  let {Downloads} = Cu.import('resource://gre/modules/Downloads.jsm');

  return function (url, file, listener) {
    if (!Downloads.getList) {
      return utils.Promise.reject(Error('downloader.js -> get -> module is not implimented'));
    }
    return utils.Promise.all([
      Downloads.createDownload({
        source: url,
        target: file
      }),
      Downloads.getList(Downloads.PUBLIC)
    ]).then(function ([dl, list]) {
      var view = {
        onDownloadChanged: function (d) {
          if (d !== dl) {
            return;
          }
          if (listener && listener.progress) {
            listener.progress(dl.currentBytes / dl.totalBytes * 100, dl.currentBytes, dl.totalBytes, dl);
          }
          if (d.stopped && d.canceled) {
            if (listener && listener.error) {
              listener.error(dl);
            }
          }
          if (d.stopped) {
            list.removeView(view);
            if (listener && listener.done) {
              if (d.succeeded) {
                listener.done(dl);
              }
              else {
                if (listener && listener.error) {
                  listener.error(dl);
                }
              }
            }
          }
        }
      };
      list.add(dl);
      list.addView(view);
      dl.start();
      return dl;
    });
  };
});
Object.defineProperty(exports, 'get', {
  get: function () {
    return exportsHelper.get;
  }
});
