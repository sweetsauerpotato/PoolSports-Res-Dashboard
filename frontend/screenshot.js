import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setViewport({ width: 1024, height: 768 });
    await page.goto('http://localhost:5175');

    await page.waitForSelector('.grid.grid-cols-3');

    const clickNumber = async (num) => {
        const btns = await page.$$('button');
        for (const b of btns) {
            const text = await page.evaluate(el => el.textContent, b);
            if (text === num.toString()) {
                await b.click();
                break;
            }
        }
    };

    await clickNumber(1);
    await clickNumber(2);
    await clickNumber(3);
    await clickNumber(4);

    await new Promise(r => setTimeout(r, 2000));

    const tableBtns = await page.$$('button');
    for (const b of tableBtns) {
        const text = await page.evaluate(el => el.textContent, b);
        if (text && text.includes('Pool 24')) {
            await b.click();
            break;
        }
    }
    await new Promise(r => setTimeout(r, 1000));

    await page.screenshot({ path: 'C:/Users/brudi/.gemini/antigravity/brain/88b3cf13-3690-4ae2-b4e5-1b7fa33b3846/glass_modal.png', fullPage: true });

    await browser.close();
})();
