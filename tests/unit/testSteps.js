"use strict";

var Steps = require("../../lib").Steps;

scope("Steps", () => {
    var ctx;

    beforeChunk(() => {
        ctx = {};
    });

    test(".makeScreenshot()", () => {

        beforeChunk(() => {
            ctx.makeScreenshot = Steps.makeScreenshot;
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

    test(".checkImagesEquivalence()", () => {

        beforeChunk(() => {
            ctx.checkImagesEquivalence = Steps.checkImagesEquivalence;
            ctx._checkImagesEquivalence = sinon.spy();
            ctx._cutElement = sinon.spy();
        });

        chunk("checks images and elements equivalence", async () => {
            var img1 = "/path/to/img1.png";
            var img2 = "/path/to/img2.png";

            await ctx.checkImagesEquivalence(img1, img2, { elements: ["ctrl"] });

            expect(ctx._checkImagesEquivalence.calledTwice).to.be.true;
            expect(ctx._cutElement.calledTwice).to.be.true;
        });
    });

    test("._displayScreenshot()", () => {

        beforeChunk(() => {
            ctx._displayScreenshot = Steps._displayScreenshot;
            ctx.__screenshot = sinon.spy((path, cb) => cb());
        });

        chunk("is passed", async () => {
            await ctx._displayScreenshot("/image/path");
            expect(ctx.__screenshot.calledOnce).to.be.true;
        });
    });
});
