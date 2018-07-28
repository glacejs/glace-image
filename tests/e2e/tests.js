"use strict";

var Page = require("glace-web").Page;

var indexPage = new Page(
    "index", "/",
    { searchField: "input#text",
        searchButton: "button.button_theme_websearch[type='submit']"});

CONF.web.url = "https://yandex.ru";

suite("e2e tests", () => {

    test("Images processing", null, [fxKillWebdriver, fxSelenium, fxWebdriver, fxBrowser], () => {

        before(() => {
            $.registerPages(indexPage);
        });
    
        chunk("Image should include image", async () => {
            await $.openPage(indexPage.name);
            var searchImage = await $.makeScreenshot({ element: "searchButton" });
            var fullImage = await $.makeScreenshot();
            await $.checkImageInclusion(fullImage, searchImage);
        });
    
        chunk("Image shouldn't include image", async () => {
            await $.openPage(indexPage.name);
            var searchImage = await $.makeScreenshot({ element: "searchButton" });
            await $.openUrl("https://opennet.ru");
            var fullImage = await $.makeScreenshot();
            await $.checkImageInclusion(
                fullImage, searchImage, { shouldBe: false });
        });
    
        chunk("Images should be equal", async () => {
            await $.openApp();
            var image1 = await $.makeScreenshot();
            var image2 = await $.makeScreenshot();
            await $.checkImagesEquivalence(image1, image2);
        });
    
        chunk("Image shouldn't be equal", async () => {
            await $.openApp();
            var image1 = await $.makeScreenshot();
            await $.openUrl("https://opennet.ru");
            var image2 = await $.makeScreenshot();
            await $.checkImagesEquivalence(image1, image2, { shouldBe: false });
        });
    
        chunk("Image should be captured by selenium", async () => {
            await $.openApp();
            await $.makeScreenshot();
        });
    
        chunk("Image should be captured by html2canvas", async () => {
            await $.openUrl("http://html2canvas.hertzen.com/");
            await $.makeScreenshot({ by: "html2canvas" });
        });
    
        chunk("Image should be captured by system", async () => {
            await $.openUrl("https://github.com");
            await $.makeScreenshot({ by: "system" });
        });
    });
    
    test("Image resizing", () => {
        var imgPath;
    
        beforeChunk(async () => {
            imgPath = await $.makeScreenshot();
        });
    
        chunk("with common percent", async () => {
            await $.resizeImage(imgPath, "75%");
        });
    
        chunk("with percent dimensions", async () => {
            await $.resizeImage(imgPath, { width: "150%", height: "125%" });
        });
    
        chunk("with pixel dimensions", async () => {
            await $.resizeImage(imgPath, { width: 800, height: 600 });
        });
    });

});
