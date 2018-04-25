"use strict";

var _ = require("lodash");
var glaceImage = require("../../lib");


test("Plugin lazy import", () => {

    chunk("empty by default", () => {
        expect(_.isEmpty(glaceImage)).to.be.true;
    });

    chunk("has config", () => {
        expect(glaceImage.config).to.exist;
    });

    chunk("has steps", () => {
        expect(glaceImage.Steps).to.exist;
    });

    chunk("has plugin help", () => {
        expect(glaceImage.pluginHelp).to.exist;
    });
});
