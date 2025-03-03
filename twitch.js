const LIMIT_CLIPS = 2;
const TWITCH_BASE_URL = 'https://www.twitch.tv';
const puppeteer = require('puppeteer');

async function getClipsTrendingUrl(lang, category) {
    const browser = await puppeteer.launch({ headless: false, args: ['--disable-web-security', '--disable-features=IsolateOrigins,site-per-process'] });
    const page = await browser.newPage();
    const [width, height] = [1920, 1080];
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36');
    await page.setViewport({ width, height });
    const clips = [];

    console.log(`🔍 Searching clips for ${category} in ${lang}...`);
    await page.goto(`https://www.twitch.tv/`);
    if (lang) {
        await page.evaluate((language) => {
            localStorage.setItem('languageDirectoryFilters', `["${language}"]`);
            location.reload();
        }, lang);
    }
    await page.goto(`https://www.twitch.tv/directory/category/${category}/clips?range=24hr`);



    await page.waitForSelector('a[data-a-target="preview-card-image-link"]');
    const clipLinks = await page.$$eval('a[data-a-target="preview-card-image-link"]', (elements, lang, category, limit) => elements.slice(0, limit).map(el => ({
        url: el.getAttribute('href'),
        title: el.querySelector('img')?.alt || '',
        duration: el.querySelector('.ScMediaCardStatWrapper-sc-anph5i-0')?.textContent || '',
        views: el.querySelectorAll('.ScMediaCardStatWrapper-sc-anph5i-0')[1]?.textContent || '',
        lang: lang,
        category: category
    })), lang, category, LIMIT_CLIPS);

    for (const clip of clipLinks) {
        const fullUrl = `${TWITCH_BASE_URL}${clip.url}`;
        clips.push({
            url: fullUrl,
            title: clip.title,
            duration: clip.duration,
            views: clip.views,
            lang: clip.lang,
            category: clip.category
        });
        console.log(`🔗 New clip found ${fullUrl}`);
    }
    await sleep(2000);



    await browser.close();
    return clips;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {getClipsTrendingUrl};
