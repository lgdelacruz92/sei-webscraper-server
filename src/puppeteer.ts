import puppeteer from "puppeteer";

export const getHtml = async (
  url: string,
  fromGetCode: boolean = false
): Promise<any> => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: "networkidle0" });
  const allColleges = [];
  async function clickButtonWhileVisible() {
    let isButtonVisible = true;
    let _start = 1;
    let _offset = 15;
    while (isButtonVisible) {
      try {
        console.log(`fetching ${_start} to ${_offset}`);
        const collegesNodes = await page.evaluate(
          (start, offset) => {
            const collegesNodeList = Array.from(
              document.querySelectorAll(
                `.cs-search-results-list-display .cs-college-card-outer-container:nth-child(n+${start}):nth-child(-n+${
                  start + offset
                })`
              )
            );
            console.log("selected nodes", collegesNodeList.length);
            return collegesNodeList.map(
              (node) => node.textContent || node.innerHTML
            );
          },
          _start,
          _offset
        );

        collegesNodes.forEach((node) => {
          allColleges.push(node);
        });

        _start = _start + _offset;

        await page.waitForSelector('[data-testid="cs-show-more-results"]', {
          timeout: 5000,
        });
        await page.click('[data-testid="cs-show-more-results"]');
        await page.evaluate(
          () => new Promise((resolve) => setTimeout(resolve, 200))
        );
      } catch (error) {
        isButtonVisible = false;
        console.log("Button no longer visible.");
      }
    }
  }
  if (!fromGetCode) {
    await clickButtonWhileVisible();
  }
  // Get the HTML content after the page has fully rendered
  //   const html = await page.content();

  await browser.close();
  return allColleges;
};

const main = async () => {
  const start = new Date().getTime();
  const result = await getHtml(
    "https://bigfuture.collegeboard.org/college-search"
  );

  const end = new Date().getTime();
  console.log("time: ", end - start);
  console.log(result);
};

main();
