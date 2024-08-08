"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHtml = void 0;
const puppeteer_1 = __importDefault(require("puppeteer"));
const getHtml = (url_1, ...args_1) => __awaiter(void 0, [url_1, ...args_1], void 0, function* (url, fromGetCode = false) {
    const browser = yield puppeteer_1.default.launch();
    const page = yield browser.newPage();
    yield page.goto(url, { waitUntil: "networkidle0" });
    const allColleges = [];
    function clickButtonWhileVisible() {
        return __awaiter(this, void 0, void 0, function* () {
            let isButtonVisible = true;
            let _start = 1;
            let _offset = 15;
            while (isButtonVisible) {
                try {
                    console.log(`fetching ${_start} to ${_offset}`);
                    const collegesNodes = yield page.evaluate((start, offset) => {
                        const collegesNodeList = Array.from(document.querySelectorAll(`.cs-search-results-list-display .cs-college-card-outer-container:nth-child(n+${start}):nth-child(-n+${start + offset})`));
                        console.log("selected nodes", collegesNodeList.length);
                        return collegesNodeList.map((node) => node.textContent || node.innerHTML);
                    }, _start, _offset);
                    collegesNodes.forEach((node) => {
                        allColleges.push(node);
                    });
                    _start = _start + _offset;
                    yield page.waitForSelector('[data-testid="cs-show-more-results"]', {
                        timeout: 5000,
                    });
                    yield page.click('[data-testid="cs-show-more-results"]');
                    yield page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 200)));
                }
                catch (error) {
                    isButtonVisible = false;
                    console.log("Button no longer visible.");
                }
            }
        });
    }
    if (!fromGetCode) {
        yield clickButtonWhileVisible();
    }
    // Get the HTML content after the page has fully rendered
    //   const html = await page.content();
    yield browser.close();
    return allColleges;
});
exports.getHtml = getHtml;
const main = () => __awaiter(void 0, void 0, void 0, function* () {
    const start = new Date().getTime();
    const result = yield (0, exports.getHtml)("https://bigfuture.collegeboard.org/college-search");
    const end = new Date().getTime();
    console.log("time: ", end - start);
    console.log(result);
});
main();
//# sourceMappingURL=puppeteer.js.map