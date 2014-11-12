var utils        = require('./utils'),
    Promise      = require("./promise").Promise,
    {Cc, Ci, Cu} = require('chrome');
    
utils.XPCOMUtils.defineLazyGetter(exports, "get", function () {
  Cu.import("resource://gre/modules/Downloads.jsm");
  var isImplemented = "getList" in Downloads;
  
  return function (url, file, listener) {
    if (!Downloads.getList) {
      return Promise.reject(Error('downloader.js -> get -> module is not implimented'));
    }
    return Promise.all([
      Downloads.createDownload({
        source: url,
        target: file
      }),
      Downloads.getList(Downloads.PUBLIC)
    ]).then(function ([dl, list]) {
      var view = {
        onDownloadChanged: function (d) {
          if (d != dl) return;
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
  }
});