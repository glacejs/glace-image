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
    chunk("should be taken via selenium by default", async () => {
        await ctx.makeScreenshot({ check: false });
        expect(ctx._seleniumScreenshot.calledOnce).to.be.true;
    });
    chunk("should be taken via selenium", async () => {
        await ctx.makeScreenshot({ by: "selenium", check: false });
        expect(ctx._seleniumScreenshot.calledOnce).to.be.true;
    });
    chunk("should be taken via html2canvas", async () => {
        await ctx.makeScreenshot({ by: "html2canvas", check: false });
        expect(ctx._canvasScreenshot.calledOnce).to.be.true;

    });
    chunk("should be taken via system display", async () => {
        await ctx.makeScreenshot({ by: "system", check: false });
        expect(ctx._displayScreenshot.calledOnce).to.be.true;
    });
});
