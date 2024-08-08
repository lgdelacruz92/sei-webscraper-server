import express, { Request, Response } from "express";
import puppeteer from "puppeteer";

const app = express();
const port = 4000;

interface CollegeData {
  name: string;
  href: string;
  address: string;
  schoolType: string;
  designation: string;
  size: string;
  setting: string;
  graduationRate: string;
  averageCost: string;
  satRange: string;
}

let taskInProgress = false;
let taskProgress = 0;
let taskCompleted = false;
let collegeData: CollegeData[] = [];

const url = "https://bigfuture.collegeboard.org/college-search";

async function runPuppeteerTask(): Promise<void> {
  taskInProgress = true;
  taskCompleted = false;
  taskProgress = 0;
  collegeData = [];

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: "networkidle0" });

    let previousChildCount = 0;
    let newChildCount = 0;

    do {
      previousChildCount = await page.evaluate(
        () =>
          document.querySelectorAll(
            ".cs-search-results-list-display .cs-college-card-container"
          ).length
      );

      try {
        await page.click('[data-testid="cs-show-more-results"]');
        await page.evaluate(
          () => new Promise((resolve) => setTimeout(resolve, 200))
        );
      } catch (e) {
        console.log("no more show more button");
        break;
      }

      newChildCount = await page.evaluate(
        () =>
          document.querySelectorAll(
            ".cs-search-results-list-display .cs-college-card-container"
          ).length
      );

      taskProgress = Math.min(100, Math.floor((newChildCount / 4300) * 100)); // Assuming a total of 5000 elements
    } while (newChildCount > previousChildCount);

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
  } catch (error) {
    console.error("Error running Puppeteer task:", error);
    throw error; // Propagate error to handle it in the caller
  } finally {
    await browser.close();
    taskInProgress = false;
    taskCompleted = true;
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

// Endpoint to get progress
app.get("/progress", (req: Request, res: Response) => {
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
