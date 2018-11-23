"use strict";

/**
 * Fixture make screenshon on chunk failure.
 *
 * @function
 */

const U = require("glace-utils");

const LOG = U.logger;

const beforeChunkCb = ctx => () => {
    ctx.errNumber = CONF.test.curCase.errors.length;
};

const afterChunkCb = ctx => async () => {
    if (CONF.test.curCase.errors.length === ctx.errNumber) return;

    var opts = {
        imageName: `fail ${CONF.test.curCase.name} ${CONF.test.curCase.chunks[0]}`
    };

    try {
        if ($.webdriver && await $.webdriver.session()) {
            opts.by = "selenium";
        } else {
            opts.by = "system";
        };
    } catch (e) {
        opts.by = "system";
    };

    try {
        await $.makeScreenshot(opts);
    } catch (e) {
        LOG.error(e);
    };
};

module.exports = U.makeFixture({ beforeChunk: beforeChunkCb, afterChunk: afterChunkCb });
