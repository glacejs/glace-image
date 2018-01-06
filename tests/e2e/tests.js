"use strict";

var Page = require("glace-web").Page;

var indexPage = new Page(
    "index", "/",
    { searchField: "input#text",
      searchButton: "button.button_theme_websearch[type='submit']"});

CONF.web.url = "https://yandex.ru";

test("Images processing", null, [fxKillWebdriver, fxSelenium, fxWebdriver, fxBrowser], () => {

    before(() => {
        SS.registerPages(indexPage);
    });

    chunk("Image should include image", async () => {
        await SS.openPage(indexPage.name);
        var searchImage = await SS.makeScreenshot({ element: "searchButton" });
        var fullImage = await SS.makeScreenshot();
        await SS.checkImageInclusion(fullImage, searchImage);
    });

    chunk("Image shouldn't include image", async () => {
        await SS.openPage(indexPage.name);
        var searchImage = await SS.makeScreenshot({ element: "searchButton" });
        await SS.openUrl("https://opennet.ru");
        var fullImage = await SS.makeScreenshot();
        await SS.checkImageInclusion(
            fullImage, searchImage, { shouldBe: false });
    });

    chunk("Images should be equal", async () => {
        await SS.openApp();
        var image1 = await SS.makeScreenshot();
        var image2 = await SS.makeScreenshot();
        await SS.checkImagesEquivalence(image1, image2);
    });

    chunk("Image shouldn't be equal", async () => {
        await SS.openApp();
        var image1 = await SS.makeScreenshot();
        await SS.openUrl("https://opennet.ru");
        var image2 = await SS.makeScreenshot();
        await SS.checkImagesEquivalence(image1, image2, { shouldBe: false });
    });

    chunk("Image should be captured by selenium", async () => {
        await SS.openApp();
        await SS.makeScreenshot();
    });

    chunk("Image should be captured by html2canvas", async () => {
        await SS.openUrl("http://html2canvas.hertzen.com/");
        await SS.makeScreenshot({ by: "html2canvas" });
    });

    chunk("Image should be captured by system", async () => {
        await SS.openUrl("https://github.com");
        await SS.makeScreenshot({ by: "system" });
    });
});
