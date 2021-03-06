"use strict";

var U = require("glace-utils");

var Steps = rewire("../../lib/steps");

suite("Steps", () => {
    var ctx, allure;

    beforeChunk(() => {
        ctx = {};
        allure = {
            step: sinon.spy(),
            pass: sinon.spy(),
            attachImage: sinon.spy(),
        };
        Steps.__set__("allure", allure);
    });

    afterChunk(() => {
        Steps.__reset__();
    });

    test(".makeScreenshot()", () => {

        beforeChunk(() => {
            ctx.makeScreenshot = Steps.makeScreenshot;
            ctx._seleniumScreenshot = sinon.spy();
            ctx._canvasScreenshot = sinon.spy();
            ctx._displayScreenshot = sinon.spy();
        });

        chunk("is taken via system by default", async () => {
            await ctx.makeScreenshot({ check: false });
            expect(ctx._displayScreenshot.calledOnce).to.be.true;
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

    test("._cutElement()", () => {
        var sharp, mkpath;

        beforeChunk(() => {
            mkpath = U.mkpath;
            U.mkpath = sinon.spy(o => o);

            sinon.stub(Steps.__fs, "renameSync");
            sinon.stub(Steps.__fs, "unlinkSync");
            sinon.stub(Steps.__fs, "existsSync").returns(true);
            sinon.stub(Steps, "__getElementLocation")
                .returns({ x: 0, y: 1, width: 2, height: 3 });

            sharp = {
                extract: sinon.spy(() => sharp),
                crop: sinon.spy(() => sharp),
                toFile: sinon.spy((t, cb) => cb()),
            };

            sinon.stub(Steps, "__sharp").returns(sharp);
        });

        afterChunk(() => {
            U.mkpath = mkpath;
            Steps.__fs.renameSync.restore();
            Steps.__fs.unlinkSync.restore();
            Steps.__fs.existsSync.restore();
            Steps.__getElementLocation.restore();
            Steps.__sharp.restore();
        });

        chunk("throws error if image doesn't exist", async () => {
            Steps.__fs.existsSync.returns(false);

            await expect(Steps._cutElement("/image/not/exist"))
                .to.be.rejectedWith("doesn't exist");
        });

        chunk("cuts element", async () => {
            var imgPath = await Steps._cutElement("/image/path", "element");

            expect(imgPath).to.include("cut-elements");
            expect(imgPath.endsWith(".png")).to.be.true;

            expect(Steps.__fs.existsSync.calledTwice).to.be.true;
            expect(Steps.__getElementLocation.calledOnce).to.be.true;
            expect(Steps.__sharp.calledOnce).to.be.true;
            expect(sharp.extract.calledOnce).to.be.true;
            expect(sharp.crop.calledOnce).to.be.true;
            expect(sharp.toFile.calledOnce).to.be.true;

            var extractArg = sharp.extract.args[0][0];
            expect(extractArg.left).to.be.equal(0);
            expect(extractArg.top).to.be.equal(1);
            expect(extractArg.width).to.be.equal(2);
            expect(extractArg.height).to.be.equal(3);
        });

        chunk("cuts element to the same file", async () => {
            expect(await Steps._cutElement("/image/path", "element",
                { path: "/image/path" }))
                .to.be.equal("/image/path");
            expect(Steps.__fs.renameSync.calledOnce).to.be.true;
            expect(Steps.__fs.unlinkSync.calledOnce).to.be.true;
        });

        chunk("cuts element with specified dir and name", async () => {
            expect(await Steps._cutElement("/image/path", "element",
                { dirPath: "/image/dir", name: "img.png" }))
                .to.be.equal("/image/dir/img.png");
        });
    });

    test(".__getElementLocation()", () => {
        var sharp, element, screen;

        beforeChunk(() => {
            element = { location: sinon.spy() };
            screen = { width: 100, height: 100 };
            sharp = {
                toBuffer: sinon.spy(cb => cb(null, null, screen)),
            };
            sinon.stub(U, "objOnScreenPos");
            sinon.stub(Steps, "__sharp").returns(sharp);
            Steps.getElement = sinon.stub().returns(element);
        });

        afterChunk(() => {
            U.objOnScreenPos.restore();
            Steps.__sharp.restore();
        });

        chunk("gets element location", async () => {
            await Steps.__getElementLocation();
            expect(Steps.getElement.calledOnce).to.be.true;
            expect(Steps.__sharp.calledOnce).to.be.true;
            expect(sharp.toBuffer.calledOnce).to.be.true;
            expect(element.location.calledOnce).to.be.true;
            expect(U.objOnScreenPos.calledOnce).to.be.true;
            expect(screen).to.include({ x: 0, y: 0, width: 100, height: 100 });
        });
    });
});
