'use strict';

var element = {};

element.tabs = {
  get list() {
    return [...document.querySelectorAll('#tabs input[type=radio]')];
  },
  get active() {
    return document.querySelector('#tabs :checked');
  }
};
element.panels = {
  get list() {
    return [...document.querySelectorAll('#panels>div')].filter(e => e.id !== 'upload');
  }
};
element.mp3 = {
  get quality() {
    return document.querySelector('#mp3 [name=mp3]:checked').value;
  },
  bitrate: {
    get constant() {
      return document.querySelector('#mp3 [data-restore="mp3-cs"]').value;
    },
    get variable() {
      return document.querySelector('#mp3 [data-restore="mp3-sv"]').value;
    }
  }
};
element.volume = {
  get percent() {
    return document.querySelector('#volume [data-restore]').value;
  }
};
element.scale = {
  get divide() {
    return document.querySelector('#scale [data-restore="scale-id"]').value;
  },
  get multiply() {
    return document.querySelector('#scale [data-restore="scale-im"]').value;
  }
};
element.rotate = {
  get selected() {
    return document.querySelector('#rotate :checked').value;
  }
};
element.shift = {
  get type() {
    return document.querySelector('#shift :checked').value;
  },
  get time() {
    return document.querySelector('#shift [type=text]').value;
  }
};
element.concat = {
  get type() {
    return document.querySelector('#concat :checked').value;
  }
};
element.cut = {
  get start() {
    return document.querySelector('#cut [data-restore="cut-if"]').value;
  },
  get end() {
    return document.querySelector('#cut [data-restore="cut-it"]').value;
  }
};
element.custom = {
  input: {
    audio: {
      get rate() {
        return document.querySelector('[data-restore="custom-iar"]').value;
      },
      set rate(val) {
        const elem = document.querySelector('[data-restore="custom-iar"]');
        elem.value = val;
        elem.dispatchEvent(new Event('change', {bubbles: true}));
      },
      get channels() {
        return document.querySelector('[data-restore="custom-iac"]').value;
      },
      set channels(val) {
        const elem = document.querySelector('[data-restore="custom-iac"]');
        elem.value = val;
        elem.dispatchEvent(new Event('change', {bubbles: true}));
      },
    },
    video: {
      get rate() {
        return document.querySelector('[data-restore="custom-ivr"]').value;
      },
      set rate(val) {
        const elem = document.querySelector('[data-restore="custom-ivr"]');
        elem.value = val;
        elem.dispatchEvent(new Event('change', {bubbles: true}));
      }
    }
  },
  output: {
    get format() {
      return document.querySelector('[data-restore="custom-of"]').value;
    },
    set format(val) {
      const elem = document.querySelector('[data-restore="custom-of"]');
      elem.value = val;
      elem.dispatchEvent(new Event('change', {bubbles: true}));
    },
    audio: {
      get rate() {
        return document.querySelector('[data-restore="custom-oab"]').value;
      },
      set rate(val) {
        const elem = document.querySelector('[data-restore="custom-oab"]');
        elem.value = val;
        elem.dispatchEvent(new Event('change', {bubbles: true}));
      }
    },
    video: {
      get rate() {
        return document.querySelector('[data-restore="custom-ovb"]').value;
      },
      set rate(val) {
        const elem = document.querySelector('[data-restore="custom-ovb"]');
        elem.value = val;
        elem.dispatchEvent(new Event('change', {bubbles: true}));
      },
      get tolerance() {
        return document.querySelector('[data-restore="custom-ovt"]').value;
      },
      set tolerance(val) {
        const elem = document.querySelector('[data-restore="custom-ovt"]');
        elem.value = val;
        elem.dispatchEvent(new Event('change', {bubbles: true}));
      },
      get size() {
        const mode = document.querySelector('[name="screen-size"]:checked').value;
        if (mode === 'predefined') {
          return document.querySelector('[data-restore="custom-sspi"]').value;
        }
        else {
          return (document.querySelector('[data-restore="custom-sscw"]').value || '800') +
            'x' +
            (document.querySelector('[data-restore="custom-ssch"]').value || '600');
        }
      },
      set size(val) {
        const elem1 = document.querySelector('[name="screen-size"]');
        elem1.checked = true;
        elem1.dispatchEvent(new Event('change', {bubbles: true}));
        const elem2 = document.querySelector('[data-restore="custom-sspi"]');
        elem2.value = val;
        elem2.dispatchEvent(new Event('change', {bubbles: true}));
      }
    }
  }
};

element.settings = {
  get mode() {
    return document.getElementById('mode');
  },
  get version() {
    return document.getElementById('client-version');
  },
  get ffmpeg() {
    return document.getElementById('ffmpeg-path');
  },
  get savein() {
    return document.getElementById('save-in');
  },
  get tmpdir() {
    return document.getElementById('tmpdir');
  },
  get port() {
    return document.getElementById('port');
  }
};
element.drag = {
  get div() {
    return document.getElementById('upload');
  },
  get input() {
    return document.querySelector('#upload input');
  },
};
element.log = {
  get parent() {
    return document.getElementById('console');
  }
};
element.instruction = {
  get parent() {
    return document.getElementById('instruction');
  },
  get step1() {
    return document.querySelector('#instruction li:first-child');
  }
};
element.busy = {
  get parent() {
    return document.getElementById('busy');
  }
};
