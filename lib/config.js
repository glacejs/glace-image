"use strict";
/**
* Configures `Image` plugin. Extends `GlaceJS` configuration.
*
* @namespace GlaceConfig
*/

var U = require("glace-utils");

var config = U.config;

if (process.platform === "win32") {
    require("binary").activateImageMagick();
};

module.exports = config;
