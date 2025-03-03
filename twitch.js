const LIMIT_CLIPS = 20;
const TWITCH_BASE_URL = 'https://www.twitch.tv';
const puppeteer = require('puppeteer');
const downloader = require('./download')

async function getClipsTrendingUrl(lang, category, maxRetries = 3, minUniqueClips = LIMIT_CLIPS) {
    let retries = 0;
    let browser;
    const delayBetweenRetries = 2000; // Temps d'attente entre chaque tentative (en ms)

    while (retries < maxRetries) {
        try {
            browser = await puppeteer.launch({ 
                headless: false, 
                args: ['--disable-web-security', '--disable-features=IsolateOrigins,site-per-process'] 
            });
            const page = await browser.newPage();
            const [width, height] = [1920, 1080];
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36');
            await page.setViewport({ width, height });
            
            // Utiliser un Map pour stocker les clips uniques (déjà filtrés)
            const uniqueClipsMap = new Map();

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
            
            // Fonction pour obtenir tous les clips visibles
            const getAllVisibleClips = async () => {
                return await page.$$eval('a[data-a-target="preview-card-image-link"]', (elements, lang, category) => 
                    elements.map(el => ({
                        url: el.getAttribute('href'),
                        title: el.querySelector('img')?.alt || '',
                        duration: el.querySelector('.ScMediaCardStatWrapper-sc-anph5i-0')?.textContent || '',
                        views: el.querySelectorAll('.ScMediaCardStatWrapper-sc-anph5i-0')[1]?.textContent || '',
                        lang,
                        category
                    }))
                , lang, category);
            };
            
            let processedUrls = new Set(); // Pour suivre les URLs déjà traitées
            let scrollAttempts = 0;
            const maxScrollAttempts = 15; // Augmenté pour donner plus de chances
            
            // Boucle de scrolling jusqu'à obtenir assez de clips uniques ou atteindre la limite de tentatives
            while (uniqueClipsMap.size < minUniqueClips && scrollAttempts < maxScrollAttempts) {
                // Obtenir les clips actuellement visibles
                const visibleClips = await getAllVisibleClips();
                
                // Traiter uniquement les clips non encore traités
                const newClips = visibleClips.filter(clip => !processedUrls.has(clip.url));
                
                console.log(`${newClips.length} nouveaux clips trouvés, traitement en cours...`);
                
                // Traitement des nouveaux clips pour obtenir leurs métadonnées
                for (const clip of newClips) {
                    // Marquer cette URL comme traitée
                    processedUrls.add(clip.url);
                    
                    const fullUrl = `${TWITCH_BASE_URL}${clip.url}`;
                    const metadata = await downloader.getClipMetaData(fullUrl);
                    
                    if (!metadata || !metadata.clippedOn || !metadata.creatorUsername) {
                        console.log(`⚠️ Métadonnées incomplètes pour ${fullUrl}, ignoré`);
                        continue;
                    }
                    
                    // Vérifier si c'est un doublon
                    const dateClip = new Date(metadata.clippedOn);
                    let estDoublon = false;
                    
                    
                    // Logique de crosscorelation basé sur le son ou sur l'image pour verifier si ça peut etre des doublons ou pas 


                    if (!estDoublon) {
                        const cle = `${metadata.creatorUsername}_${dateClip.getTime()}`;
                        const clipComplet = {
                            url: fullUrl,
                            title: clip.title,
                            duration: clip.duration,
                            views: clip.views,
                            lang: clip.lang,
                            category: clip.category,
                            metadata
                        };
                        
                        uniqueClipsMap.set(cle, clipComplet);
                        console.log(`🔗 Nouveau clip unique ajouté: ${fullUrl} (${uniqueClipsMap.size}/${minUniqueClips})`);
                    }
                    
                    // Si nous avons suffisamment de clips uniques, sortir de la boucle
                    if (uniqueClipsMap.size >= minUniqueClips) {
                        break;
                    }
                }
                
                // Afficher le statut actuel
                console.log(`Clips uniques: ${uniqueClipsMap.size}/${minUniqueClips}`);
                
                // Si nous avons suffisamment de clips uniques, sortir de la boucle
                if (uniqueClipsMap.size >= minUniqueClips) {
                    console.log(`${uniqueClipsMap.size} clips uniques trouvés, suffisant!`);
                    break;
                }
                
                // Si aucun nouveau clip n'a été trouvé pendant plusieurs tentatives, augmenter le scroll
                if (newClips.length === 0 && scrollAttempts > 3) {
                    console.log(`Aucun nouveau clip trouvé, augmentation de la distance de scroll...`);
                    await page.evaluate(() => {
                        window.scrollBy(0, window.innerHeight * 2);
                    });
                } else {
                    console.log(`Besoin de plus de clips uniques (${uniqueClipsMap.size}/${minUniqueClips}). Scrolling... (tentative ${scrollAttempts + 1}/${maxScrollAttempts})`);
                    await page.evaluate(() => {
                        // ne fonctionne pas car il faut scroll sur la grille des clips et non sur la page globale
                        window.scrollBy(0, window.innerHeight);
                    });
                }
                
                // Attendre que le contenu se charge
                await sleep(3000);
                scrollAttempts++;
            }
            
            // Convertir le Map en tableau de clips uniques
            const clipsUniques = Array.from(uniqueClipsMap.values());
            
            console.log(`Total de ${clipsUniques.length} clips uniques récupérés`);
            
            await sleep(2000);
            await browser.close();
            return clipsUniques;
        } catch (error) {
            retries++;
            console.error(`Error during clip fetch (Attempt ${retries} of ${maxRetries}):`, error);

            // Fermer le navigateur même si une erreur se produit
            if (browser) await browser.close();

            if (retries >= maxRetries) {
                throw new Error('Max retries reached, unable to fetch clips');
            }

            console.log(`Retrying in ${delayBetweenRetries}ms...`);
            await sleep(delayBetweenRetries);
        }
    }
}



function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { getClipsTrendingUrl };
