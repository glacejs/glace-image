"use strict";

var LOG = require("glace-utils").logger;

require("../../lib/fixtures");
var fixture = rewire("../../lib/fixtures/fxScreenOnFail");

suite("fixtures", () => {

    test("fxScreenOnFail", () => {

        chunk("exists global", () => {
            expect(fxScreenOnFail).to.be.a("function");
        });

        chunk("is called correct", () => {
            var func = sinon.spy();
            fixture(func);
            expect(func).to.be.calledOnce;
        });
    });

    test("afterCb", () => {
        var sandbox = sinon.createSandbox();
        var afterCb = fixture.__get__("afterCb");

        beforeChunk(() => {
            sandbox.stub(LOG, "error");
            SS.makeScreenshot = sinon.spy();
            SS.webdriver = {
                session: sinon.stub().returns(true),
            };
        });

        afterChunk(() => {
            delete SS.makeScreenshot;
            delete SS.webdriver;
            sandbox.restore();
            fixture.__reset__();
        });

        chunk("do nothing if no fails", async () => {
            await afterCb({ errNumber: 0 })();
            expect(SS.makeScreenshot).to.not.be.called;
        });

        chunk("makes screenshot with selenium if browser launched", async () => {
            await afterCb({})();
            expect(SS.makeScreenshot).to.be.calledOnce;
            expect(SS.makeScreenshot.args[0][0].by).to.be.equal("selenium");
        });

        chunk("makes screenshot with system if no browser", async () => {
            SS.webdriver.session.returns(false);
            await afterCb({})();
            expect(SS.makeScreenshot).to.be.calledOnce;
            expect(SS.makeScreenshot.args[0][0].by).to.be.equal("system");
        });

        chunk("makes screenshot with system if selenium is failed", async () => {
            SS.webdriver.session = function () {
                throw new Error("BOOM!");
            };
            await afterCb({})();
            expect(SS.makeScreenshot).to.be.calledOnce;
            expect(SS.makeScreenshot.args[0][0].by).to.be.equal("system");
        });

        chunk("skipped if screencapture is failed", async () => {
            SS.makeScreenshot = sinon.spy(function () {
                throw new Error("BOOM!");
            });
            await afterCb({})();
            expect(SS.makeScreenshot).to.be.calledOnce;
            expect(LOG.error).to.be.calledOnce;
        });
    });
});
