"use strict";

var pluginHelp = require("../../lib").pluginHelp;

suite("help", () => {

    test("plugin help contains option", () => {

        var opts = pluginHelp({ options: opts => opts }, d => d);

        chunk("screenshot-on-fail", () => {
            expect(opts["screenshot-on-fail"]).to.exist;
        });
    });
});
