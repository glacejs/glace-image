"use strict";

var Image = require("../../lib/image");

scope("Image", () => {
    var image, sharpObj;

    beforeChunk(() => {
        sharpObj = {
            metadata: sinon.spy(() => Promise.resolve({ hasAlpha: true,
                                                        channels: 4,
                                                        width: 800,
                                                        height: 600 })),
            resize: sinon.spy(() => sharpObj),
            raw: sinon.spy(() => sharpObj),
            extract: sinon.spy(() => sharpObj),
            toBuffer: sinon.spy(() => Promise.resolve("toBuffer")),
            toFile: sinon.spy(() => Promise.resolve("toFile")),
        };

        image = new Image("/path/to/image.png",
                          undefined,
                          { sharp: sinon.stub().returns(sharpObj) });
        image._tolerance = 0.05;
    });

    test("instance", () => {

        chunk("has default options", () => {
            expect(image._srcPath).to.be.equal("/path/to/image.png");
            expect(image._srcOpts.scaleX).to.be.equal(1);
            expect(image._srcOpts.scaleY).to.be.equal(1);
        });

        chunk("passes options", () => {
            image = new Image("/some/image.jpg", { scaleX: 2, scaleY: 3 });
            expect(image._srcPath).to.be.equal("/some/image.jpg");
            expect(image._srcOpts.scaleX).to.be.equal(2);
            expect(image._srcOpts.scaleY).to.be.equal(3);
        });

        chunk("creates new instance without new", () => {
            image = Image("/some/img");
            expect(image._srcPath).to.be.equal("/some/img");
            expect(image._srcOpts.scaleX).to.be.equal(1);
            expect(image._srcOpts.scaleY).to.be.equal(1);
        });
    });

    test(".isTransparent()", () => {

        chunk("returns true", async () => {
            image._getPixels = sinon.stub().returns([[{ R: 0, G: 0, B: 0, A: 0 }]]);
            expect(await image.isTransparent()).to.be.true;
        });

        chunk("returns false", async () => {
            image._getPixels = sinon.stub().returns([[{ R: 0, G: 0, B: 0, A: 1 }]]);
            expect(await image.isTransparent()).to.be.false;
        });
    });

    test(".isMonochrome()", () => {

        chunk("returns true", async () => {
            image._getPixels = sinon.stub().returns([[{ R: 1, G: 1, B: 1, A: 1 }]]);
            expect(await image.isMonochrome()).to.be.true;
        });

        chunk("returns false", async () => {
            image._getPixels = sinon.stub().returns(
                [[{ R: 0, G: 0, B: 0, A: 0 }, { R: 1, G: 1, B: 1, A: 1 }]]);
            expect(await image.isMonochrome()).to.be.false;
        });
    });

    test(".isBlack()", () => {

        chunk("returns true", async () => {
            image._getPixels = sinon.stub().returns([[{ R: 0, G: 0, B: 0, A: 255 }]]);
            expect(await image.isBlack()).to.be.true;
        });

        chunk("returns false", async () => {
            image._getPixels = sinon.stub().returns([[{ R: 1, G: 1, B: 1, A: 255 }]]);
            expect(await image.isBlack()).to.be.false;
        });
    });

    test(".isWhite()", () => {

        chunk("returns true", async () => {
            image._getPixels = sinon.stub().returns([[{ R: 255, G: 255, B: 255, A: 255 }]]);
            expect(await image.isWhite()).to.be.true;
        });

        chunk("returns false", async () => {
            image._getPixels = sinon.stub().returns([[{ R: 254, G: 254, B: 254, A: 255 }]]);
            expect(await image.isWhite()).to.be.false;
        });
    });

    test(".includes()", () => {

        beforeChunk(() => {
            image._loadImg = sinon.spy(() => Promise.resolve());
        });

        chunk("doesn't include image", async () => {
            image._includes = sinon.stub().returns({ isIncluded: false });
            expect((await image.includes("/path/to/image.png")).isIncluded).to.be.false;
        });

        chunk("includes image", async () => {
            image._includes = sinon.stub().returns({ isIncluded: true,
                                                     offsetX: 0,
                                                     offsetY: 0,
                                                     width: 1,
                                                     height: 1 });
            image._saveMatchImage = sinon.spy(() => Promise.resolve());

            var res = await image.includes(
                "/path/to/image.png", { matchedPath: "/path/to/matched.png" });

            expect(res.isIncluded).to.be.true;
            expect(res.offsetX).to.be.equal(0);
            expect(res.offsetY).to.be.equal(0);
            expect(res.width).to.be.equal(1);
            expect(res.height).to.be.equal(1);
            expect(res.matchedPath).to.be.equal("/path/to/matched.png");

            expect(image._loadImg.calledTwice).to.be.true;
            expect(image._includes.calledOnce).to.be.true;
            expect(image._saveMatchImage.calledOnce).to.be.true;
        });
    });

    test("._loadImg()", () => {

        chunk("loads image", async () => {
            var res = await image._loadImg("/path/to/img.png",
                                           { scaleX: 1, scaleY: 1 });

            expect(res.width).to.be.equal(800);
            expect(res.height).to.be.equal(600);
            expect(res.data).to.be.equal("toBuffer");
            expect(res.channels).to.be.equal(4);
            expect(res.hasAlpha).to.be.equal(true);
        });
    });

    test("._saveMatchImage()", () => {

        chunk("saves matched image", async () => {
            image._matchedPath = "/path/to/matched.png";
            var res = await image._saveMatchImage(1, 2, 3, 4);

            expect(image.__sharp.calledOnce).to.be.true;
            expect(image.__sharp.args[0][0]).to.be.equal(image._srcPath);

            expect(sharpObj.extract.calledOnce).to.be.true;
            expect(sharpObj.extract.args[0][0].left).to.be.equal(1);
            expect(sharpObj.extract.args[0][0].top).to.be.equal(2);
            expect(sharpObj.extract.args[0][0].width).to.be.equal(3);
            expect(sharpObj.extract.args[0][0].height).to.be.equal(4);

            expect(sharpObj.toFile.calledOnce).to.be.true;
            expect(sharpObj.toFile.args[0][0]).to.be.equal("/path/to/matched.png");
        });
    });

    test("._includes()", () => {

        beforeChunk(() => {
            image._cropPixels = sinon.spy(o => o);
            image._getPixels = sinon.spy(o => o);
        });

        chunk("includes image", () => {
            var src = [[{ R: 0, G: 0, B: 0, A: 255 }]];
            var dst = [[{ R: 0, G: 0, B: 0, A: 255 }]];
            var res = image._includes(src, dst);

            expect(res.isIncluded).to.be.true;
            expect(res.diffValue).to.be.equal(0);
            expect(res.offsetX).to.be.equal(0);
            expect(res.offsetY).to.be.equal(0);
            expect(res.width).to.be.equal(1);
            expect(res.height).to.be.equal(1);
        });

        chunk("doesn't include image", () => {
            var src = [[{ R: 0, G: 0, B: 0, A: 255 }]];
            var dst = [[{ R: 255, G: 255, B: 255, A: 255 }]];
            var res = image._includes(src, dst);

            expect(res.isIncluded).to.be.false;
        });
    });

    test("._getUsedPixels()", () => {

        chunk("gets used pixels", () => {
            var pixels = [[{ R: 0, G: 0, B: 0, A: 0 }],
                          [{ R: 0, G: 0, B: 0, A: 255 }]];
            var res = image._getUsedPixels(pixels);

            expect(res).to.have.length(1);
            expect(res[0].x).to.be.equal(0);
            expect(res[0].y).to.be.equal(1);
        });
    });

    test("._getDiffValue()", () => {

        chunk("gets images diff value", () => {
            var src = [[{ R: 0, G: 0, B: 0, A: 0 }]];
            var dst = [{ pixel: { R: 0, G: 0, B: 0, A: 0 }, x: 0, y: 0 }];

            expect(image._getDiffValue(src, dst, 0, 0)).to.be.equal(0);
        });
    });

    test("._isPixelUsed()", () => {

        chunk("returns true", () => {
            expect(image._isPixelUsed({ A: 255 })).to.be.true;
        });

        chunk("returns false", () => {
            expect(image._isPixelUsed({ A: 0 })).to.be.false;
        });
    });

    test("._isPixelTolerant()", () => {

        chunk("returns true", () => {
            var src = { R: 0, G: 0, B: 0, A: 255 };
            var dst = { R: 0, G: 0, B: 0, A: 255 };

            expect(image._isPixelTolerant(src, dst)).to.be.true;
        });

        chunk("returns false", () => {
            var src = { R: 0, G: 0, B: 0, A: 255 };
            var dst = { R: 255, G: 255, B: 255, A: 255 };

            expect(image._isPixelTolerant(src, dst)).to.be.false;
        });
    });

    test("._getPixels()", () => {

        chunk("gets pixels", () => {
            var img = {
                height: 1,
                width: 1,
                channels: 4,
                hasAlpha: true,
                data: [ 127, 128, 129, 130 ],
            };
            var res = image._getPixels(img)[0][0];

            expect(res.R).to.be.equal(127);
            expect(res.G).to.be.equal(128);
            expect(res.B).to.be.equal(129);
            expect(res.A).to.be.equal(130);
        });
    });

    test("._cropPixels()", () => {
        chunk("crops pixels", () => {
            var pixels = [[{ R: 1, G: 1, B: 1, A: 0 }, { R: 1, G: 1, B: 1, A: 0 }, { R: 1, G: 1, B: 1, A: 0 }],
                          [{ R: 1, G: 1, B: 1, A: 0 }, { R: 1, G: 1, B: 1, A: 1 }, { R: 1, G: 1, B: 1, A: 0 }],
                          [{ R: 1, G: 1, B: 1, A: 0 }, { R: 1, G: 1, B: 1, A: 0 }, { R: 1, G: 1, B: 1, A: 0 }]];

            var res = image._cropPixels(pixels)[0][0];
            for (var c of ["R", "G", "B", "A"]) expect(res[c]).to.be.equal(1);
        });
    });
});
