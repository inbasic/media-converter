/* globals element, ffmpeg, log */
'use strict';

document.addEventListener('dragover', e => {
  e.preventDefault();
  e.stopPropagation();
  e.dataTransfer.dropEffect = 'none';
}, false);

function drop(e) {
  e.stopPropagation();
  e.preventDefault();
  const files = e.target.files || e.dataTransfer.files; // FileList object
  const mode = element.tabs.active.dataset.for;
  const recipe = (function() {
    const options = {};
    if (mode === 'mp3') {
      options.quality = element.mp3.quality;
      options.bitrate = element.mp3.bitrate[options.quality];
    }
    else if (mode === 'volume') {
      options.volume = element.volume.percent;
    }
    else if (mode === 'scale') {
      options.divide = element.scale.divide;
      options.multiply = element.scale.multiply;
    }
    else if (mode === 'rotate') {
      options.angle = element.rotate.selected;
    }
    else if (mode === 'shift') {
      options.type = element.shift.type;
      options.time = element.shift.time;
    }
    else if (mode === 'cut') {
      options.start = element.cut.start;
      options.end = element.cut.end;
    }
    else if (mode === 'custom') {
      options.input = {
        audio: {
          rate: element.custom.input.audio.rate,
          channels: element.custom.input.audio.channels
        },
        video: {
          rate: element.custom.input.video.rate
        }
      };
      options.output = {
        format: element.custom.output.format,
        audio: {
          rate: element.custom.output.audio.rate,
        },
        video: {
          size: element.custom.output.video.size,
          rate: element.custom.output.video.rate,
          torerance: element.custom.output.video.torerance
        }
      };
    }
    return options;
  })();
  //
  if (mode === 'muxer' || mode === 'concat') {
    ffmpeg.emit('job', {
      files: [...files],
      mode,
      recipe
    });
  }
  else {
    log.emit('clean');
    ffmpeg.emit('job', [...files].map(file => ({
      files: [file],
      mode,
      recipe
    })));
  }
}
element.drag.input.addEventListener('change', drop);
element.drag.div.addEventListener('dragover', e => {
  if (e.dataTransfer.types.indexOf('Files') !== -1) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'link';
  }
  else {
    e.dataTransfer.dropEffect = 'none';
  }
}, false);
element.drag.div.addEventListener('drop', drop, false);
