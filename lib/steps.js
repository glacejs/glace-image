"use strict";
/**
 * Steps to manage screenshots and images.
 * 
 * These methods are mixed with glacejs [Steps](https://glacejs.github.io/glace-core/Steps.html)
 * class and available via its instance [SS](https://glacejs.github.io/glace-core/global.html#SS)
 * in tests.
 *
 * @mixin ImageSteps
 */

var fs = require("fs");
var path = require("path");

var _ = require("lodash");
var imageDiff = require("image-diff");
var screenshot = require("desktop-screenshot");
var sharp = require("sharp");
var uuid = require("uuid/v4");
var U = require("glace-utils");

require("./fixtures");
var image = require("./image");

sharp.cache(false);

var ImageSteps = {
    __fs: fs,
    __screenshot: screenshot,
    __sharp: sharp,
    /**
     * Step to make screenshot of browser or display.
     *
     * @async
     * @method
     * @instance
     * @arg {object} [opts] - Step options.
     * @arg {string} [opts.imageName] - Screenshot name. File extension
     *  `.png` will be added automatically. Default value is dynamically
     *  generated on each call with algorithm `uuid`.
     * @arg {string} [opts.imageDirPath] - Screenshot folder path.
     * @arg {boolean} [opts.by=selenium] - Screenshot variant. Supported
     *  values are `selenium`, `html2canvas`, `system`.
     * @arg {?string} [opts.cssSelector=null] - CSS selector of DOM element
     *  which of screenshot should be made.
     * @arg {?string} [opts.backColor=null] - Background color for html2canvas.
     *  Transparent by default.
     * @arg {?function} [opts.preHook=null] - Function which will be called
     *  in `Steps` context in the beginning of step.
     * @arg {?function} [opts.postHook=null] - Function which will be called
     *  in `Steps` context at the end of step.
     * @arg {?string} [opts.element=null] - Web element name which should be
     *  screenshotted.
     * @arg {boolean} [opts.check=true] - Flag to check screenshot is saved
     *  or no.
     * @return {Promise<string>} Path to saved screenshot.
     * @throws {AssertionError} If screenshot isn't saved.
     * @example
     *
     * await SS.makeScreenshot(); // saves screenshot with generated file name
     * await SS.makeScreenshot({ imageName: "my image" }); // saves screenshot with custom name
     * await SS.makeScreenshot({ imageName: "my image", element: "searchButton" });
     */
    makeScreenshot: async function (opts) {

        opts = U.defVal(opts, {});

        var imageName = U.defVal(opts.imageName, uuid());
        imageName = U.toKebab(imageName);
        if (!imageName.endsWith(".png")) imageName += ".png";

        var imagePath = U.mkpath(
            U.defVal(opts.imageDirPath, getScreensDir()),
            imageName);

        var by = U.defVal(opts.by, "selenium");
        var cssSelector = U.defVal(opts.cssSelector);
        var backColor = U.defVal(opts.backColor);
        var preHook = U.defVal(opts.preHook);
        var postHook = U.defVal(opts.postHook);
        var element = U.defVal(opts.element);
        var check = U.defVal(opts.check, true);

        expect(["selenium", "html2canvas", "system"]).to.include(by);

        if (preHook) await preHook.call(this);

        if (by === "selenium") {
            await this._seleniumScreenshot(imagePath);
        };
        if (by === "html2canvas") {
            await this._canvasScreenshot(
                imagePath, { cssSelector: cssSelector, backColor: backColor });
        };
        if (by === "system") {
            await this._displayScreenshot(imagePath);
        };

        if (element) {
            await this._cutElement(imagePath, element, { path: imagePath });
        };

        if (check) {
            expect(fs.existsSync(imagePath),
                   `Screenshot isn't saved to '${imagePath}'`).to.be.true;

            expect(await image(imagePath).isTransparent(),
                   `Screenshot '${imagePath}' has empty content`).to.be.false;
        };

        if (postHook) await postHook.call(this);

        CONF.curTestCase.addScreenshot(imagePath);
        return imagePath;
    },
    /**
     * Step to check whether two image are equal or not equal.
     *
     * @async
     * @method
     * @instance
     * @arg {string} actualImage - Path to actual image.
     * @arg {string} expectedImage - Path to expected image.
     * @arg {object} [opts] - Helper options.
     * @arg {number} [opts.threshold=0.05] - Threshold of divergence.
     * @arg {boolean} [opts.shouldBe=true] - Flag to check whether
     *  image are equal or not equal.
     * @arg {string[]} [opts.elements=[]] - List of elements on image which
     *  should be verified.
     * @return {Promise<void>}
     * @throws {AssertionError} If result of images comparison doesn't pass
     *  requested parameters.
     * @example
     *
     * await SS.checkImagesEquivalence("./actual.png", "./expected.png");
     * await SS.checkImagesEquivalence("./actual.png", "./expected.png", { shouldBe: false });
     */
    checkImagesEquivalence: async function (actualImage, expectedImage, opts) {
        opts = U.defVal(opts, {});
        var elements = U.defVal(opts.elements, []);

        await this._checkImagesEquivalence(actualImage, expectedImage, opts);
        for (var element of elements) {
            var actualElImage = await this._cutElement(
                actualImage, element, { name: `actual ${element}` });
            var expectedElImage = await this._cutElement(
                expectedImage, element, { name: `expected ${element}` });
            await this._checkImagesEquivalence(
                actualElImage, expectedElImage, opts);
        };
    },
    /**
     * Step to check one image includes or doesn't include another image.
     *
     * @async
     * @method
     * @instance
     * @arg {string} fullImage - Path to image which may include.
     * @arg {string} includedImage - Path to image which may be included.
     * @arg {object} [opts] - Step options.
     * @arg {object} [opts.matchedDirPath] - Folder path to save matched image.
     * @arg {number} [opts.threshold=0.05] - Threshold of divergence.
     * @arg {boolean} [opts.shouldBe=true] - Flag to check whether
     *  image are equal or not equal.
     * @return {Promise<void>}
     * @throws {AssertionError} If result of images inclusion doesn't pass
     *  requested parameters.
     * @example
     *
     * await SS.checkImageInclusion("./full.png", "./part.png");
     * await SS.checkImageInclusion("./full.png", "./part.png", { shouldBe: false });
     */
    checkImageInclusion: async function (fullImage, includedImage, opts) {

        opts = U.defVal(opts, {});
        var threshold = U.defVal(opts.threshold, 0.05);
        var shouldBe = U.defVal(opts.shouldBe, true);

        var matchedImagePath = U.mkpath(
            U.defVal(
                opts.matchedDirPath,
                path.resolve(getScreensDir(), "inclusions")),
            uuid() + ".png");

        var errMsg = "Image " + fullImage +
                     " doesn't contain image " + includedImage;

        var result = await image(fullImage)
            .includes(includedImage, { tolerance: threshold,
                                       matchedPath: matchedImagePath });

        if (shouldBe) {
            expect(result.isIncluded,
                   `Image ${fullImage} doesn't include ${includedImage}`)
                .be.true;
        } else {
            expect(result.isIncluded,
                   `Image ${fullImage} includes image ${includedImage}`)
                .be.false;
        };
    },
    /**
     * Step to check or make screenshot of browser or display.
     *
     * @async
     * @method
     * @instance
     * @arg {string} imageName - Screenshot name. File extension
     *  `.png` will be added automatically.
     * @arg {object} [opts] - Step options.
     * @arg {string} [opts.imageDirPath] - Screenshot folder path.
     * @arg {string} [opts.expectedDirPath] - Expected screenshot path.
     * @arg {boolean} [opts.by=selenium] - Screenshot variant. Supported
     *  values are `selenium`, `html2canvas`, `system`.
     * @arg {?string} [opts.cssSelector=null] - CSS selector of DOM element
     *  which of screenshot should be made.
     * @arg {?string} [opts.backColor=null] - Background color for html2canvas.
     *  Transparent by default.
     * @arg {?function} [opts.preHook=null] - Function which will be called
     *  in `Steps` context in the beginning of step.
     * @arg {?function} [opts.postHook=null] - Function which will be called
     *  in `Steps` context at the end of step.
     * @arg {string[]} [opts.elements=[]] - List of elements on image which
     *  should be verified.
     * @arg {boolean} [opts.check=true] - Flag to check screenshot is saved
     *  or no.
     * @return {Promise<void>}
     * @throws {AssertionError} If screenshot isn't saved.
     * @example
     *
     * await SS.checkOrMakeScreenshot("my image");
     * await SS.checkOrMakeScreenshot("my image", { by: "html2canvas" });
     */
    checkOrMakeScreenshot: async function (imageName, opts) {
        imageName = U.toKebab(imageName);

        opts = U.defVal(opts, {});
        opts.imageName = imageName;
        var actualImage = await this.makeScreenshot(opts);

        if (CONF.compareImages) {
            testName = CONF.curTestCase ? U.toKebab(CONF.curTestCase.name) : "";

            var expectedImage = path.resolve(
                U.defVal(
                    opts.expectedDirPath,
                    path.resolve(CONF.resourcesDir, testName, "screenshots")),
                imageName + ".png");

            await this.checkImagesEquivalence(
                actualImage, expectedImage, opts);
        };
    },
    /**
     * Helper to check two images are equal or not equal.
     *
     * @ignore
     * @async
     * @method
     * @protected
     * @instance
     * @arg {string} actualImage - Path to actual image.
     * @arg {string} expectedImage - Path to expected image.
     * @arg {object} [opts] - Helper options.
     * @arg {string} [opts.diffDirPath] - Path to diffs folder.
     * @arg {number} [opts.threshold=0.05] - Threshold of divergence.
     * @arg {boolean} [opts.shouldBe=true] - Flag to check whether
     *  image are equal or not equal.
     * @return {Promise<void>}
     * @throws {AssertionError} - If actual image doesn't exist.
     * @throws {AssertionError} - If expected image doesn't exist.
     * @throws {AssertionError} - If result of images comparison don't pass
     *  requested parameters.
     */
    _checkImagesEquivalence: async function (actualImage, expectedImage, opts) {

        expect(fs.existsSync(actualImage),
               `Actual image '${actualImage}' doesn't exist`)
            .to.be.true;

        expect(fs.existsSync(expectedImage),
               `Expected image '${expectedImage}' doesn't exist`)
            .to.be.true;

        opts = U.defVal(opts, {});
        var threshold = U.defVal(opts.threshold, 0.05);
        var shouldBe = U.defVal(opts.shouldBe, true);

        var diffImage = U.mkpath(
            U.defVal(
                opts.diffDirPath,
                path.resolve(getScreensDir(), "diffs")),
            uuid() + ".png");

        var percentage = (await new Promise((resolve, reject) => {

            imageDiff.getFullResult({
                actualImage: actualImage,
                expectedImage: expectedImage,
                diffImage: diffImage
            }, function(err, result) {
                if (err) reject(err);
                resolve(result);
            });

        })).percentage;

        if (shouldBe) {
            expect(percentage,
                   "Images are not equal").be.lte(threshold);
        } else {
            expect(percentage,
                   "Images are equal").be.gte(threshold);
        };
    },
    /**
     * Helper to make screenshot of display.
     *
     * @ignore
     * @async
     * @method
     * @protected
     * @instance
     * @arg {string} imagePath - Path to screenshot which will be saved.
     * @return {Promise<void>}
     */
    _displayScreenshot: async function (imagePath) {
        await new Promise((resolve, reject) => {
            this.__screenshot(imagePath, err => {
                if (err) return reject(err);
                resolve();
            });
        });
    },
    /**
     * Helper to make screenshot with selenium.
     *
     * @ignore
     * @async
     * @method
     * @protected
     * @instance
     * @arg {string} imagePath - Path to screenshot which will be saved.
     * @return {Promise<void>}
     */
    _seleniumScreenshot: async function (imagePath) {
        await this.webdriver.saveScreenshot(imagePath);
    },
    /**
     * Helper to make screenshot with html2canvas.
     *
     * @ignore
     * @async
     * @method
     * @protected
     * @instance
     * @arg {string} imagePath - Path to screenshot which will be saved.
     * @arg {object} [opts] - Helper options.
     * @arg {?string} [opts.cssSelector=null] - CSS selector of DOM element
     *  which of screenshot should be made.
     * @arg {?string} [opts.backColor=null] - Background color, transparent by
     *  default.
     * @arg {number} [opts.timeout=30000] - Time to wait for screenshot is
     *  rendered, ms
     * @return {Promise<void>}
     * @throws {Error} - If screenshot will not be rendered during timeout.
     */
    _canvasScreenshot: async function (imagePath, opts) {

        opts = U.defVal(opts, {});
        var cssSelector = U.defVal(opts.cssSelector);
        var backColor = U.defVal(opts.backColor);
        var timeout = U.defVal(opts.timeout, 30000);

        var errMsg = "Can't make screenshot";
        if (cssSelector) errMsg += " of element with selector " + cssSelector;

        await this.webdriver.execute(function (cssSelector, backColor) {

            function makeScreenshot () {
                if (cssSelector) {
                    var element = document.querySelector(cssSelector);
                } else {
                    var element = document.body;
                };
                html2canvas(
                    element,
                    {
                        backgroundColor: backColor,
                        useCORS: true  // capture images from another domains
                    }).then(function (canvas) {
                        window.__screenshot = canvas
                            .toDataURL()
                            .split("data:image/png;base64,")[1];
                    });
            };

            if (typeof(html2canvas) !== "undefined") {
                makeScreenshot();
                return;
            };

            var script = document.createElement("script");
            script.onload = makeScreenshot;
            script.src = "http://html2canvas.hertzen.com/dist/html2canvas.min.js";
            document.body.appendChild(script);

        }, cssSelector, backColor);

        var screenBase64 = await this.webdriver.waitUntil(async () => {

            return (await this.webdriver.execute(function () {

                if (window.__screenshot) {
                    var result = window.__screenshot;
                    delete window.__screenshot;
                    return result;
                } else {
                    return false;
                };

            })).value;

        }, timeout, errMsg);

        fs.writeFileSync(imagePath, screenBase64, "base64");
    },
    /**
     * Helper to cut element from image.
     *
     * @ignore
     * @async
     * @method
     * @protected
     * @instance
     * @arg {string} imagePath - Path to image which element will be cut from.
     * @arg {string} elementName - Name of element which will be cut.
     * @arg {object} [opts] - Helper options.
     * @arg {string} [opts.path] - Path to cut image.
     * @arg {string} [opts.dirPath] - Folder path to cut image.
     * @arg {string} [opts.name] - Name of cut image with element.
     * @return {Promise<string>} - Path to cut image.
     * @throws {AssertionError} - If original image doesn't exist.
     * @throws {AssertionError} - If DOM element is not registered in config.
     * @throws {AssertionError} - If cut image is not saved.
     */
    _cutElement: async function (imagePath, elementName, opts) {

        expect(this.__fs.existsSync(imagePath),
               `Image ${imagePath} doesn't exist`).be.true;

        var eLoc = await this.__getElementLocation(elementName, imagePath);

        opts = U.defVal(opts, {});

        var targetName = U.toKebab(U.defVal(opts.name, uuid()));
        if (!targetName.endsWith(".png")) targetName += ".png";

        var targetPath = U.mkpath(
            U.defVal(
                opts.path,
                path.resolve(
                    U.defVal(opts.dirPath,
                             path.resolve(getScreensDir(), "cut-elements")),
                    targetName)));

        if (imagePath === targetPath) {
            this.__fs.renameSync(imagePath, imagePath + ".tmp");
            imagePath += ".tmp";
        };

        await new Promise((resolve, reject) => {
            this.__sharp(imagePath)
                .extract({ left: eLoc.x,
                           top: eLoc.y,
                           width: eLoc.width,
                           height: eLoc.height })
                .crop(sharp.strategy.entropy)
                .toFile(targetPath, err => {
                    if (err) reject(err);
                    resolve();
                });
        });

        expect(this.__fs.existsSync(targetPath,
                                    `Image ${targetPath} isn't saved`)).be.true;
        if (imagePath.endsWith(".tmp")) this.__fs.unlinkSync(imagePath);

        return targetPath;
    },
    /**
     * Helper to get element location.
     *
     * @ignore
     * @async
     * @method
     * @private
     * @instance
     * @arg {string} name - Element name.
     * @arg {string} imagePath - Path to image.
     * @return {object} - Dict with `x`, `y`, `width`, `height` keys.
     */
    __getElementLocation: async function (name, imagePath) {

        var element = await this.getElement(name);

        var imageInfo = await new Promise((resolve, reject) => {
            this.__sharp(imagePath).toBuffer((err, outputBuffer, info) => {
                if (err) reject(err);
                resolve(info);
            });
        });

        imageInfo.x = 0;
        imageInfo.y = 0;

        var eLoc = await element.location();
        return U.objOnScreenPos(eLoc, imageInfo);
    },
};
module.exports = ImageSteps;
/**
 * Helper to get screenshots folder.
 *
 * @ignore
 * @function
 */
var getScreensDir = () => {
    var testName = CONF.curTestCase ? U.toKebab(CONF.curTestCase.name) : "";
    return path.resolve(CONF.reportsDir, testName, "screenshots");
};
