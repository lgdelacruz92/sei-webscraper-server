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
const express_1 = __importDefault(require("express"));
const puppeteer_extra_1 = __importDefault(require("puppeteer-extra"));
const puppeteer_extra_plugin_stealth_1 = __importDefault(require("puppeteer-extra-plugin-stealth"));
const cors_1 = __importDefault(require("cors"));
puppeteer_extra_1.default.use((0, puppeteer_extra_plugin_stealth_1.default)());
const app = (0, express_1.default)();
const port = 4000;
app.use((0, cors_1.default)());
let taskInProgress = false;
let taskProgress = 0;
let taskCompleted = false;
let collegeData = [];
const url = "https://bigfuture.collegeboard.org/college-search";
function runPuppeteerTask() {
    return __awaiter(this, void 0, void 0, function* () {
        taskInProgress = true;
        taskCompleted = false;
        taskProgress = 0;
        collegeData = [];
        const browser = yield puppeteer_extra_1.default.launch({ headless: false });
        const page = yield browser.newPage();
        try {
            yield page.goto(url, { waitUntil: "networkidle0" });
            let previousChildCount = 0;
            let newChildCount = 0;
            do {
                previousChildCount = yield page.evaluate(() => document.querySelectorAll(".cs-search-results-list-display .cs-college-card-container").length);
                //   try {
                yield page.waitForSelector('[data-testid="cs-show-more-results"]', {
                    timeout: 5000,
                });
                yield page.click('[data-testid="cs-show-more-results"]');
                yield page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 200)));
                //   } catch (e) {
                //     console.log("no more show more button");
                //     break;
                //   }
                newChildCount = yield page.evaluate(() => document.querySelectorAll(".cs-search-results-list-display .cs-college-card-container").length);
                taskProgress = Math.min(100, Math.floor((newChildCount / 4300) * 100)); // Assuming a total of 5000 elements
            } while (newChildCount > previousChildCount);
            collegeData = yield page.evaluate(() => {
                return Array.from(document.querySelectorAll(".cs-college-card-container")).map((college) => {
                    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
                    const name = (((_a = college.querySelector(".cs-college-card-college-name-link-text")) === null || _a === void 0 ? void 0 : _a.textContent) || "Unknown Name").trim();
                    const href = (((_b = college.querySelector("a")) === null || _b === void 0 ? void 0 : _b.getAttribute("href")) || "No Link").trim();
                    const address = (((_c = college.querySelector(".cs-college-card-college-address")) === null || _c === void 0 ? void 0 : _c.textContent) || "Unknown Address").trim();
                    const schoolType = (((_d = college.querySelector('[data-testid="cs-college-card-details-profile-school-type-by-years"]')) === null || _d === void 0 ? void 0 : _d.textContent) || "Unknown Type").trim();
                    const designation = (((_e = college.querySelector('[data-testid="cs-college-card-details-profile-school-type-by-designation"]')) === null || _e === void 0 ? void 0 : _e.textContent) || "Unknown Designation").trim();
                    const size = (((_f = college.querySelector('[data-testid="cs-college-card-details-profile-school-size"]')) === null || _f === void 0 ? void 0 : _f.textContent) || "Unknown Size").trim();
                    const setting = (((_g = college.querySelector('[data-testid="cs-college-card-details-profile-school-setting"]')) === null || _g === void 0 ? void 0 : _g.textContent) || "Unknown Setting").trim();
                    const graduationRate = (((_h = college.querySelector('[data-testid="cs-college-card-details-profile-school-graduation-rate"] strong')) === null || _h === void 0 ? void 0 : _h.textContent) || "Unknown Graduation Rate").trim();
                    const averageCost = (((_j = college.querySelector('[data-testid="cs-college-card-details-profile-school-average-cost"] strong')) === null || _j === void 0 ? void 0 : _j.textContent) || "Unknown Cost").trim();
                    const satRange = (((_k = college.querySelector('[data-testid="cs-college-card-details-profile-school-sat-range"] strong')) === null || _k === void 0 ? void 0 : _k.textContent) || "Unknown SAT Range").trim();
                    return {
                        name,
                        href,
                        address,
                        schoolType,
                        designation,
                        size,
                        setting,
                        graduationRate,
                        averageCost,
                        satRange,
                    };
                });
            });
        }
        catch (error) {
            console.error("Error running Puppeteer task:", error);
            throw error; // Propagate error to handle it in the caller
        }
        finally {
            console.log("college data length", collegeData.length);
            yield browser.close();
            taskInProgress = false;
            taskCompleted = true;
        }
    });
}
app.post("/start-task", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (taskInProgress) {
        return res.status(400).json({ message: "Task is already in progress." });
    }
    try {
        runPuppeteerTask().catch((error) => {
            console.error("Puppeteer task failed:", error);
            taskInProgress = false;
            taskCompleted = false;
        });
        res.json({ message: "Task started" });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to start task", error });
    }
}));
// Endpoint to get progress
app.get("/progress", (req, res) => {
    res.json({
        inProgress: taskInProgress,
        progress: taskProgress,
        completed: taskCompleted,
        data: taskCompleted ? collegeData : [],
    });
});
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
const main = () => __awaiter(void 0, void 0, void 0, function* () {
    yield runPuppeteerTask().catch((error) => {
        console.error("Puppeteer task failed:", error);
        taskInProgress = false;
        taskCompleted = false;
    });
});
main();
//# sourceMappingURL=server.js.map