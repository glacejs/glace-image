"use strict";

/**
 * Fixture make screenshon on chunk failure.
 *
 * @function
 */

var LOG = require("glace-utils").logger;

module.exports = func => {
    var o = {};

    beforeChunk(() => {
        o.errNumber = CONF.curTestCase.errors.length;
    });

    func();

    afterChunk(afterCb(o));
};

var afterCb = o => async () => {
    if (CONF.curTestCase.errors.length === o.errNumber) return;

    var opts = {
        imageName: `fail ${CONF.curTestCase.name} ${CONF.curTestCase.chunks[0]}`
    };

    try {
        if (SS.webdriver && await SS.webdriver.session()) {
            opts.by = "selenium";
        } else {
            opts.by = "system";
        };
    } catch (e) {
        opts.by = "system";
    };

    try {
        await SS.makeScreenshot(opts);
    } catch (e) {
        LOG.error(e);
    };
};
