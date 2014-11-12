##Media Converter (imconverter)
Media Converter is a complete cross-platform solution to convert audio and video files. After installation, a toolbar button will be placed in your Firefox toolbar. By clicking on the button, the conversion window appears. This window will let you perform three operations: MP3 conversion, audio muxing, and video/audio combining.

###General information
To compile imconverter project you need to have these softwares and libraries available:
* [python](http://www.python.org/getit/)
* [nodejs](http://nodejs.org/)
* [Mozilla addon-sdk](https://addons.mozilla.org/en-US/developers/builder)

  > By default, the addon-sdk folder is assumed to be one directory above the project. This can be modified using the ``--sdk`` parameter.

###Folders description
* compile: nodejs auto-compiler
* preview: screenshots
* src: imconverter source code
* template: bootstrap folder

###How to compile imconverter
1. Open a new terminal in the root dir (directory contains src, preview, template, and compile folders)
2. Run ``npm install`` to acquire the necessary nodejs packages
3. Run ``node compile/install.js`` to run imconverter in a new Firefox profile
   To make the xpi run ``node compile/install.js --xpi``
   To make the xpi and install the extension in your current profile run ``node compile/install.js --wget``
   For more options use ``node compile/install.js --help``

###How to try precompiled latest version
1. Select the right branch
2. Browse the src directory
3. Download the raw *.xpi file
4. Drag and drop it into Firefox
