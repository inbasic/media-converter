'use strict';

var Native = function() {
  if (chrome.runtime.connectNative) {
    this.channel = chrome.runtime.connectNative('com.add0n.node');
  }
  this.platform = navigator.platform.startsWith('Win') ? 'Windows' : navigator.platform;
};
// Events
Native.prototype.onDisconnect = function(onDisconnect) {
  if (this.channel) {
    this.channel.onDisconnect.addListener(onDisconnect);
  }
  else {
    onDisconnect();
  }
};
Native.prototype.onMessage = function(onMessage) {
  if (this.channel) {
    this.channel.onMessage.addListener(onMessage);
  }
};
// Actions
Native.prototype.toString = function(msg) {
  if (msg.data && msg.type === 'Buffer') {
    return String.fromCharCode(...msg.data);
  }
  return msg.data;
};
Native.prototype.disconnect = function() {
  this.channel.disconnect();
};
Native.prototype.spec = function() {
  if (this.channel) {
    this.channel.postMessage({
      cmd: 'spec'
    });
  }
};
Native.prototype.dir = function(path) {
  this.channel.postMessage({
    cmd: 'dir',
    path
  });
};
Native.prototype.ifup = function(port, key) {
  this.channel.postMessage({
    cmd: 'ifup',
    port,
    key
  });
};
Native.prototype.exec = function(command, args, env = []) {
  this.channel.postMessage({
    cmd: 'exec',
    command,
    arguments: args,
    env
  });
};
Native.prototype.spawn = function(command, args, env = []) {
  this.channel.postMessage({
    cmd: 'spawn',
    command,
    arguments: args,
    env
  });
};
Native.prototype['clean-tmp'] = function() {
  this.channel.postMessage({
    cmd: 'clean-tmp'
  });
};
Native.prototype.cut = function(obj) {
  this.channel.postMessage(Object.assign(obj, {
    cmd: 'copy'
  }));
};
