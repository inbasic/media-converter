var utils = require('./system/utils'),
    sp    = require("sdk/simple-prefs");
var showHotKey, callback;

function execute()  {
  if (utils.prefs.hotkey) {
    showHotKey = utils.Hotkey({
      combo: utils.prefs.hotkey,
      onPress: callback
    });
  }
  else if (showHotKey) {
    showHotKey.destroy();
  }
}

sp.on("hotkey", execute);
exports.install = function (f) {
  callback = f;
  execute();
};