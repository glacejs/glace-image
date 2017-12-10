"use strict";

var sinon = require("sinon");

var Steps = require("../../lib").Steps;

test(".makeScreenshot", () => {
    var ctx = {};

    before(() => {
        ctx.makeScreenshot = Steps.makeScreenshot;
    });
    beforeChunk(() => {
        ctx._seleniumScreenshot = sinon.spy();
        ctx._canvasScreenshot = sinon.spy();
        ctx._displayScreenshot = sinon.spy();
    });
    chunk("is taken via selenium by default", async () => {
        await ctx.makeScreenshot({ check: false });
        expect(ctx._seleniumScreenshot.calledOnce).to.be.true;
    });
    chunk("is taken via selenium", async () => {
        await ctx.makeScreenshot({ by: "selenium", check: false });
        expect(ctx._seleniumScreenshot.calledOnce).to.be.true;
    });
    chunk("is taken via html2canvas", async () => {
        await ctx.makeScreenshot({ by: "html2canvas", check: false });
        expect(ctx._canvasScreenshot.calledOnce).to.be.true;

    });
    chunk("is taken via system display", async () => {
        await ctx.makeScreenshot({ by: "system", check: false });
        expect(ctx._displayScreenshot.calledOnce).to.be.true;
    });
});

test("._displayScreenshot", () => {
    var ctx = {};

    before(() => {
        ctx._displayScreenshot = Steps._displayScreenshot;
    });

    beforeChunk(() => {
        ctx.__screenshot = sinon.spy((path, cb) => cb());
    });

    chunk("is passed", async () => {
        await ctx._displayScreenshot("/image/path");
        expect(ctx.__screenshot.calledOnce).to.be.true;
    });
});
