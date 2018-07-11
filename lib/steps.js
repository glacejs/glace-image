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

var fse = require("fs-extra");
var screenshot = require("desktop-screenshot");
var sharp = require("sharp");
var temp = require("temp").track();
var uuid = require("uuid/v4");
var U = require("glace-utils");
var LOG = U.logger;

require("./fixtures");
var image = require("./image");

sharp.cache(false);

var ImageSteps = {
    __fs: fs,
    __screenshot: screenshot,
    __sharp: sharp,

    makeScreenshot: async function (opts) {
        /**
         * Step to make screenshot of browser or display.
         *
         * @async
         * @memberOf ImageSteps
         * @method makeScreenshot
         * @instance
         * @arg {object} [opts] - Step options.
         * @arg {string} [opts.imageName] - Screenshot name. File extension
         *  `.png` will be added automatically. Default value is dynamically
         *  generated on each call with algorithm `uuid`.
         * @arg {string} [opts.imageDirPath] - Screenshot folder path.
         * @arg {boolean} [opts.by] - Screenshot variant. Supported
         *  values are `selenium`, `html2canvas`, `system`. By default
         *  `selenium` if browser is launched, `system` otherwise.
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

        opts = U.defVal(opts, {});

        var imageName = U.defVal(opts.imageName, uuid());
        imageName = U.toKebab(imageName);
        if (!imageName.endsWith(".png")) imageName += ".png";

        var imagePath = U.mkpath(
            U.defVal(opts.imageDirPath, getScreensDir()),
            imageName);

        var by = U.defVal(opts.by);
        var cssSelector = U.defVal(opts.cssSelector);
        var backColor = U.defVal(opts.backColor);
        var preHook = U.defVal(opts.preHook);
        var postHook = U.defVal(opts.postHook);
        var element = U.defVal(opts.element);
        var check = U.defVal(opts.check, true);

        if (!by) {
            if (this.webdriver && await this.webdriver.session()) {
                by = "selenium";
            } else {
                by = "system";
            }
        }
        allure.step(`Screenshot with ${by}`);

        expect(["selenium", "html2canvas", "system"]).to.include(by);

        LOG.info(`Making screenshot with ${by}...`);

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

        CONF.test.curCase.addScreenshot(imagePath);

        LOG.info(`Screenshot is saved to ${imagePath}`);
        allure.attachImage("screenshot", imagePath);
        allure.pass();

        return imagePath;
    },

    checkImagesEquivalence: async function (actualImage, expectedImage, opts) {
        /**
         * Step to check whether two image are equal or not equal.
         *
         * @async
         * @memberOf ImageSteps
         * @method checkImagesEquivalence
         * @instance
         * @arg {string} actualImage - Path to actual image.
         * @arg {string} expectedImage - Path to expected image.
         * @arg {object} [opts] - Helper options.
         * @arg {number} [opts.threshold=0.05] - Threshold of divergence.
         * @arg {boolean} [opts.shouldBe=true] - Flag to check whether
         *  image are equal or not equal.
         * @arg {string[]} [opts.elements=[]] - List of elements on image which
         *  should be verified.
         * @arg {string} [opts.diffDirPath] - Path to diffs folder.
         * @return {Promise<void>}
         * @throws {AssertionError} If result of images comparison doesn't pass
         *  requested parameters.
         * @example
         *
         * await SS.checkImagesEquivalence("./actual.png", "./expected.png");
         * await SS.checkImagesEquivalence("./actual.png", "./expected.png", { shouldBe: false });
         */

        opts = U.defVal(opts, {});
        var elements = U.defVal(opts.elements, []);

        if (opts.shouldBe === false) {
            allure.step(`Check that image ${actualImage} isn't equal to ${expectedImage}`);
        } else {
            allure.step(`Check that image ${actualImage} is equal to ${expectedImage}`);
        }
        LOG.info("Checking images equivalence...");

        await this._checkImagesEquivalence(actualImage, expectedImage, opts);
        for (var element of elements) {
            var actualElImage = await this._cutElement(
                actualImage, element, { name: `actual ${element}` });
            var expectedElImage = await this._cutElement(
                expectedImage, element, { name: `expected ${element}` });
            await this._checkImagesEquivalence(
                actualElImage, expectedElImage, opts);
        };

        LOG.info("Images equivalence is checked");
        allure.pass();
    },

    checkImageInclusion: async function (fullImage, includedImage, opts) {
        /**
         * Step to check one image includes or doesn't include another image.
         *
         * @async
         * @memberOf ImageSteps
         * @method checkImageInclusion
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

        opts = U.defVal(opts, {});
        var threshold = U.defVal(opts.threshold, 0.05);
        var shouldBe = U.defVal(opts.shouldBe, true);

        if (shouldBe) {
            allure.step(`Check that image ${fullImage} includes ${includedImage}`);
        } else {
            allure.step(`Check that image ${fullImage} doesn't include ${includedImage}`);
        }

        var matchedImagePath = U.mkpath(
            U.defVal(
                opts.matchedDirPath,
                path.resolve(getScreensDir(), "inclusions")),
            uuid() + ".png");

        LOG.info("Checking images inclusion...");

        var result = await image(fullImage)
            .includes(includedImage, { tolerance: threshold,
                matchedPath: matchedImagePath });

        if (shouldBe) {
            expect(result.isIncluded,
                `Image '${fullImage}' doesn't include '${includedImage}' but should`)
                .be.true;
        } else {
            expect(result.isIncluded,
                `Image '${fullImage}' includes '${includedImage}' but shouldn't`)
                .be.false;
        };

        LOG.info("Images inclusion is checked");
        allure.pass();
    },

    resizeImage: async function (imgPath, percent, opts) {
        /**
         * Step to resize image.
         *
         * @async
         * @memberOf ImageSteps
         * @method resizeImage
         * @instance
         * @arg {string} imgPath - Path to resizing image.
         * @arg {string} [percent] - Percent to resize, for example `150%`.
         * @arg {object} [opts] - Step options.
         * @arg {string|number} [opts.width] - Width of resized image in pixels or percent.
         * @arg {string|number} [opts.height] - Height of resized image in pixels or percent.
         * @arg {boolean} [opts.check=true] - Check that image is resized.
         * @return {Promise}
         * @throws {AssertionError} If image path doesn't exist.
         * @throws {AssertionError} If image can't be resized.
         * @example
         *
         * await SS.resizeImage(imgPath, "75%");
         * await SS.resizeImage(imgPath, { width: "150%", height: "125%" });
         * await SS.resizeImage(imgPath, { width: 800, height: 600 });
         */

        var metadata, width, height, wPercent, hPercent;

        expect(fs.existsSync(imgPath),
            `Image '${imgPath}' doesn't exist`).to.be.true;

        if (typeof(percent) === "object") {
            opts = percent;
            percent = undefined;
        }

        opts = U.defVal(opts, {});
        var check = U.defVal(opts.check, true);

        if (typeof(opts.width) === "string" && opts.width.endsWith("%")) {
            wPercent = parseInt(opts.width);
        } else if (opts.width === undefined) {
            wPercent = 100;
        } else {
            width = opts.width;
        }

        if (typeof(opts.height) === "string" && opts.height.endsWith("%")) {
            hPercent = parseInt(opts.height);
        } else if (opts.height === undefined) {
            hPercent = 100;
        } else {
            height = opts.height;
        }

        if (typeof(percent) === "string" && percent.endsWith("%")) {
            wPercent = hPercent = parseInt(percent);
        }

        if (wPercent && hPercent) {
            metadata = await sharp(imgPath).metadata();
            width = Math.ceil(metadata.width * wPercent / 100);
            height = Math.ceil(metadata.height * hPercent / 100);
        }

        allure.step(`Resize image ${imgPath} to [width=${width}, height=${height}]`);
        LOG.info(`Resizing image '${imgPath}' to [width=${width}, height=${height}]...`);

        var tmpPath = temp.path({ suffix: path.extname(imgPath) });
        await sharp(imgPath).resize(width, height).toFile(tmpPath);

        if (check) {
            metadata = await sharp(tmpPath).metadata(); 
            expect({ width: metadata.width, height: metadata.height },
                `Can't resize image '${imgPath}'`)
                .to.be.eql({ width: width, height: height });
        }

        fs.unlinkSync(imgPath);
        fse.moveSync(tmpPath, imgPath);

        LOG.info("Image is resized");
        allure.attachImage("resized", imgPath);
        allure.pass();
    },

    checkOrMakeScreenshot: async function (imageName, opts) {
        /**
         * Step to check or make screenshot of browser or display.
         *
         * @async
         * @memberOf ImageSteps
         * @method checkOrMakeScreenshot
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
         * @arg {string} [opts.diffDirPath] - Path to diffs folder.
         * @arg {boolean} [opts.check=true] - Flag to check screenshot is saved
         *  or no.
         * @return {Promise<void>}
         * @throws {AssertionError} If screenshot isn't saved.
         * @example
         *
         * await SS.checkOrMakeScreenshot("my image");
         * await SS.checkOrMakeScreenshot("my image", { by: "html2canvas" });
         */

        imageName = U.toKebab(imageName);

        opts = U.defVal(opts, {});
        opts.imageName = imageName;
        var actualImage = await this.makeScreenshot(opts);

        if (CONF.compareImages) {
            var testName = CONF.test.curCase ? U.toKebab(CONF.test.curCase.name) : "";

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

        var percentage = await image(actualImage).equalTo(
            expectedImage, { tolerance: threshold, diffPath: diffImage });

        if (shouldBe) {
            expect(percentage,
                `Image '${actualImage}' isn't equal to '${expectedImage}' ` +
                `but should. Diff image is '${diffImage}'`).be.lte(threshold);
        } else {
            expect(percentage,
                `Image '${actualImage}' is equal to '${expectedImage}' ` +
                `but shouldn't. Diff image is '${diffImage}'`).be.gte(threshold);
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
                var element;
                if (cssSelector) {
                    element = document.querySelector(cssSelector);
                } else {
                    element = document.body;
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
                var result;
                if (window.__screenshot) {
                    result = window.__screenshot;
                    delete window.__screenshot;
                } else {
                    result = false;
                };
                return result;
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
    var testName = CONF.test.curCase ? U.toKebab(CONF.test.curCase.name) : "";
    return path.resolve(CONF.report.dir, testName, "screenshots");
};
