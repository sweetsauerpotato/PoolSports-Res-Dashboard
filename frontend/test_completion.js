import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // 1. Load app and login
    await page.goto('http://localhost:5173');
    await new Promise(r => setTimeout(r, 1000));
    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const clickBtn = (text) => {
            const b = btns.find(el => el.textContent === text);
            if (b) b.click();
        };
        clickBtn('1');
        clickBtn('2');
        clickBtn('3');
        clickBtn('4');
    });
    await new Promise(r => setTimeout(r, 1500));

    // 2. Click "Pool 26" which is BELEGT
    const tableBtns = await page.$$('button');
    for (const b of tableBtns) {
        const text = await page.evaluate(el => el.textContent, b);
        if (text && text.includes('Pool 26')) {
            await b.click();
            break;
        }
    }
    await new Promise(r => setTimeout(r, 1000));

    // 3. Click "Tisch freigeben" in the modal
    const freeBtn = await page.evaluateHandle(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.find(b => b.textContent && b.textContent.includes('freigeben'));
    });
    if (freeBtn) {
        await freeBtn.click();
        await new Promise(r => setTimeout(r, 1000));
    }

    // 4. Switch to List View (Tabellenansicht)
    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const listBtn = btns.find(b => b.innerHTML.includes('<line x1="8" y1="6"'));
        if (listBtn) listBtn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    // 5. Filter by "Beendet"
    await page.evaluate(() => {
        const selects = Array.from(document.querySelectorAll('select'));
        if (selects[1]) {
            selects[1].value = 'completed';
            selects[1].dispatchEvent(new Event('change', { bubbles: true }));
        }
    });
    await new Promise(r => setTimeout(r, 1000));

    // Capture proof
    await page.screenshot({ path: 'beendet_status.png', fullPage: true });
    console.log("Screenshot saved as beendet_status.png");
    await browser.close();
})();
