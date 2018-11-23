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

    test("afterChunkCb", () => {
        var sandbox = sinon.createSandbox();
        var afterChunkCb = fixture.__get__("afterChunkCb");

        beforeChunk(() => {
            sandbox.stub(LOG, "error");
            $.makeScreenshot = sinon.spy();
            $.webdriver = {
                session: sinon.stub().returns(true),
            };
        });

        afterChunk(() => {
            delete $.makeScreenshot;
            delete $.webdriver;
            sandbox.restore();
            fixture.__reset__();
        });

        chunk("do nothing if no fails", async () => {
            await afterChunkCb({ errNumber: 0 })();
            expect($.makeScreenshot).to.not.be.called;
        });

        chunk("makes screenshot with selenium if browser launched", async () => {
            await afterChunkCb({})();
            expect($.makeScreenshot).to.be.calledOnce;
            expect($.makeScreenshot.args[0][0].by).to.be.equal("selenium");
        });

        chunk("makes screenshot with system if no browser", async () => {
            $.webdriver.session.returns(false);
            await afterChunkCb({})();
            expect($.makeScreenshot).to.be.calledOnce;
            expect($.makeScreenshot.args[0][0].by).to.be.equal("system");
        });

        chunk("makes screenshot with system if selenium is failed", async () => {
            $.webdriver.session = function () {
                throw new Error("BOOM!");
            };
            await afterChunkCb({})();
            expect($.makeScreenshot).to.be.calledOnce;
            expect($.makeScreenshot.args[0][0].by).to.be.equal("system");
        });

        chunk("skipped if screencapture is failed", async () => {
            $.makeScreenshot = sinon.spy(function () {
                throw new Error("BOOM!");
            });
            await afterChunkCb({})();
            expect($.makeScreenshot).to.be.calledOnce;
            expect(LOG.error).to.be.calledOnce;
        });
    });
});
