'use strict';

var EventEmitter = function () {
  this.callbacks = {};
};
EventEmitter.prototype.on = function (id, callback) {
  this.callbacks[id] = this.callbacks[id] || [];
  this.callbacks[id].push(callback);
};
EventEmitter.prototype.emit = function (id, value) {
  (this.callbacks[id] || []).forEach(c => c(value));
};

function vCompare (v1, v2) {
  const toNumber = (v) => v.split('.')
    .slice(0, 3)
    .reverse()
    .map((v, i) => (+v) * Math.pow(10, i)).reduce((p, c) => c + p, 0);
  return toNumber(v1) - toNumber(v2);
}
