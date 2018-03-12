"use strict";
/**
* Configures `Image` plugin. Extends `GlaceJS` configuration.
*
* @namespace GlaceConfig
*/

var U = require("glace-utils");

var config = U.config;
var args = config.args;

if (process.platform === "win32") {
    require("binary").activateImageMagick();
};

config.image = U.defVal(config.image, {});
config.image.screenOnFail = args.screenshotOnFail;

module.exports = config;
