import express, { Request, Response } from "express";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import bodyParser from "body-parser";
import cors from "cors";
import { getCollegesByPage, insertCollege } from "./db";

puppeteer.use(StealthPlugin());
const app = express();
const port = 4000;
app.use(cors());
app.use(bodyParser.json({ limit: "5mb" }));
// Alternatively, for parsing URL-encoded data
app.use(bodyParser.urlencoded({ extended: true }));

interface CollegeData {
  name: string;
  href: string;
  address: string;
  // schoolType: string;
  // designation: string;
  // size: string;
  // setting: string;
  // graduationRate: string;
  // averageCost: string;
  // satRange: string;
  code?: string;
}

let taskInProgress = false;
let taskProgress = 0;
let taskCompleted = false;
let collegeData: CollegeData[] = [];

const url = "https://bigfuture.collegeboard.org/college-search";

const sleep = async (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

let collegeDataWithCode: CollegeData[] = [];

async function runGetSchoolCodesTask(
  collegeData: CollegeData[]
): Promise<void> {
  taskInProgress = true;
  taskCompleted = false;
  taskProgress = 0;
  collegeDataWithCode = [];
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.setRequestInterception(true);
  page.on("request", (request) => {
    if (request.resourceType() === "image") request.abort();
    else request.continue();
  });

  let i = 0;
  for (const d of collegeData) {
    try {
      const { href, name, address, ...rest } = d;
      await page.goto(href, { waitUntil: "domcontentloaded" });
      await page.waitForSelector(
        '[data-testid="csp-more-about-college-board-code-valueId"]',
        {
          timeout: 5000,
        }
      );
      const code = await page.evaluate(
        () =>
          document.querySelector(
            '[data-testid="csp-more-about-college-board-code-valueId"]'
          ).innerHTML
      );
      await sleep(500);
      console.log("getting school code for ", name);
      collegeDataWithCode.push({ ...rest, name, address, href, code });
      const [city, state] = address.split(",").map((e) => e.trim());
      insertCollege(name, city, state, code, href);
      taskProgress = Math.min(100, Math.floor((i / collegeData.length) * 100));
      i += 1;
    } catch (e) {
      console.log(`error in ${d}. Skipping...`);
    }
  }
  await browser.close();
  taskInProgress = false;
  taskCompleted = true;
  taskProgress = 100;
}

async function runPuppeteerTask(): Promise<void> {
  taskInProgress = true;
  taskCompleted = false;
  taskProgress = 0;
  collegeData = [];

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.setRequestInterception(true);
  page.on("request", (request) => {
    if (request.resourceType() === "image") request.abort();
    else request.continue();
  });

  await page.goto(url, { waitUntil: "domcontentloaded" });
  let isButtonVisible = true;

  while (isButtonVisible) {
    try {
      await page.waitForSelector('[data-testid="cs-show-more-results"]', {
        timeout: 5000,
      });
      await page.click('[data-testid="cs-show-more-results"]');
      await page.evaluate(
        () => new Promise((resolve) => setTimeout(resolve, 200))
      );
      const progress = await page.evaluate(
        () =>
          document.querySelectorAll(
            ".cs-search-results-list-display .cs-college-card-container"
          ).length
      );
      await sleep(500);
      break;
      taskProgress = Math.min(100, Math.floor((progress / 4300) * 100));
      console.log("task progress", taskProgress);
    } catch (error) {
      isButtonVisible = false;
      console.log("Button no longer visible.");
    }
  }
  try {
    collegeData = await page.evaluate(() => {
      return Array.from(
        document.querySelectorAll(".cs-college-card-container")
      ).map((college) => {
        const name = (
          college.querySelector(".cs-college-card-college-name-link-text")
            ?.textContent || "Unknown Name"
        ).trim();
        const href = (
          college.querySelector("a")?.getAttribute("href") || "No Link"
        ).trim();
        const address = (
          college.querySelector(".cs-college-card-college-address")
            ?.textContent || "Unknown Address"
        ).trim();
        const schoolType = (
          college.querySelector(
            '[data-testid="cs-college-card-details-profile-school-type-by-years"]'
          )?.textContent || "Unknown Type"
        ).trim();
        const designation = (
          college.querySelector(
            '[data-testid="cs-college-card-details-profile-school-type-by-designation"]'
          )?.textContent || "Unknown Designation"
        ).trim();
        const size = (
          college.querySelector(
            '[data-testid="cs-college-card-details-profile-school-size"]'
          )?.textContent || "Unknown Size"
        ).trim();
        const setting = (
          college.querySelector(
            '[data-testid="cs-college-card-details-profile-school-setting"]'
          )?.textContent || "Unknown Setting"
        ).trim();
        const graduationRate = (
          college.querySelector(
            '[data-testid="cs-college-card-details-profile-school-graduation-rate"] strong'
          )?.textContent || "Unknown Graduation Rate"
        ).trim();
        const averageCost = (
          college.querySelector(
            '[data-testid="cs-college-card-details-profile-school-average-cost"] strong'
          )?.textContent || "Unknown Cost"
        ).trim();
        const satRange = (
          college.querySelector(
            '[data-testid="cs-college-card-details-profile-school-sat-range"] strong'
          )?.textContent || "Unknown SAT Range"
        ).trim();

        return {
          name,
          href,
          address,
          // schoolType,
          // designation,
          // size,
          // setting,
          // graduationRate,
          // averageCost,
          // satRange,
        };
      });
    });
  } catch (error) {
    console.error("Error running Puppeteer task:", error);
    throw error; // Propagate error to handle it in the caller
  } finally {
    console.log("college data length", collegeData.length);
    await browser.close();
    taskInProgress = false;
    taskCompleted = true;
    taskProgress = 100;
  }
}

app.post("/start-task", async (req: Request, res: Response) => {
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
  } catch (error) {
    res.status(500).json({ message: "Failed to start task", error });
  }
});

app.post("/get-school-codes", async (req: Request, res: Response) => {
  const { data } = req.body;
  if (taskInProgress) {
    return res.status(400).json({ message: "Task is already in progress." });
  }

  try {
    runGetSchoolCodesTask(data).catch((error) => {
      console.error("Puppeteer task failed:", error);
      taskInProgress = false;
      taskCompleted = false;
    });

    res.json({ message: "School codes started" });
  } catch (error) {
    res.status(500).json({ message: "Failed to start task", error });
  }
});

// Endpoint to get progress
app.get("/school-codes-progress", (req: Request, res: Response) => {
  res.json({
    inProgress: taskInProgress,
    progress: taskProgress,
    completed: taskCompleted,
    data: taskCompleted ? collegeDataWithCode : [],
  });
});

// Endpoint to get progress
app.get("/progress", (req: Request, res: Response) => {
  res.json({
    inProgress: taskInProgress,
    progress: taskProgress,
    completed: taskCompleted,
    data: taskCompleted ? collegeData : [],
  });
});

// Endpoint to get progress
app.get("/getColleges", (req: Request, res: Response) => {
  const { page, pageSize } = req.query;
  const colleges = getCollegesByPage(page, pageSize);
  res.json({ page, pageSize, ...colleges });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

// const main = async () => {
//   await runPuppeteerTask().catch((error) => {
//     console.error("Puppeteer task failed:", error);
//     taskInProgress = false;
//     taskCompleted = false;
//   });
// };

// main();
