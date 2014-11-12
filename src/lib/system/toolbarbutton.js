var buttons = require('sdk/ui/button/action'),
    self    = require("sdk/self"),
    l10n    = require("sdk/l10n").get;

var handleClick = function () {}

var button = buttons.ActionButton({
  id: "imconverter",
  label: l10n("title"),
  icon: {
    "16": "./icons/16.png",
    "32": "./icons/32.png",
    "64": "./icons/64.png"
  },
  onClick: function () {
    return handleClick();
  }
});

exports.install = function (f) {
  if (f) handleClick = f;
}
