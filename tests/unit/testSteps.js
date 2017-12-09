"use strict";

var Steps = require("../../lib").Steps;

test(".makeScreenshot", () => {

    var ctx = {},
        called = null;

    before(() => {
        ctx.makeScreenshot = Steps.makeScreenshot;
        ctx._seleniumScreenshot = function () { called = "selenium"; };
        ctx._canvasScreenshot = function () { called = "html2canvas"; };
        ctx._displayScreenshot = function () { called = "display"; };
    });
    beforeChunk(() => called = null);

    chunk("should be taken via selenium by default", async () => {
        await ctx.makeScreenshot({ check: false });
        expect(called).to.be.equal("selenium");
    });
    chunk("should be taken via selenium", async () => {
        await ctx.makeScreenshot({ by: "selenium", check: false });
        expect(called).to.be.equal("selenium");
    });
    chunk("should be taken via html2canvas", async () => {
        await ctx.makeScreenshot({ by: "html2canvas", check: false });
        expect(called).to.be.equal("html2canvas");

    });
    chunk("should be taken via system display", async () => {
        await ctx.makeScreenshot({ by: "system", check: false });
        expect(called).to.be.equal("display");
    });
});
