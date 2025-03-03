const config = require('./config')
const twitch = require('./twitch')
const downloader = require('./download')
const edit = require('./edit')
const youtube = require('./youtube')
const fs = require("fs");
const thumbnail = require('./thumbnail')
const cache = require('./cache')

async function start() {
    const cacheManager = new cache()
    cacheManager.ensureCache()
    for (let conf of config.CONFIG) {
        const lang = conf.lang;
        const category = conf.category;
        if (conf.skip) {
            console.log(`🚫 Skipping ${category} for ${lang}`);
            continue;
        }
        if (!conf.youtube_channel) {
            console.log(`🚫 No youtube channel for ${category} for ${lang}`)
            continue;
        }
        console.log('🔗 Lang : ', lang);
        console.log('🎥 Video : ', category);
        try {
           const clips = await twitch.getClipsTrendingUrl(lang, category);
           console.log("🔗 Number of links found ", clips.length);
           console.log("💎 Number of unique clips ", clips.length);
           for (const i in clips) {
            let retryCount = 0;
            const maxRetries = 5;
            let success = false;
        
                while (retryCount <= maxRetries && !success) {
                    try {
                        if (retryCount > 0) {
                            console.log(`Retry attempt ${retryCount} for clip: ${clips[i].url}`);
                            await sleep(5000); // Longer wait between retries
                        } else {
                            await sleep(2000);
                        }
                        
                        const { filepath } = await downloader.downloadClip(clips[i], clips[i].lang, clips[i].category, i);
                        clips[i].filepath = filepath;
                        console.log('Editing in vertical format');
                        if(conf.skipShort || i < 6) {
                            console.log(`🚫 Skip shorts for ${category} for ${lang}`)
                            success = true
                            continue
                        }
                        if(config.BLACKLIST_AUTHOR.includes(clips[i].metadata.creatorUsername)) {
                            console.log(`🚫 Banned author found ${clips[i].metadata.creatorUsername}`)
                            fs.unlinkSync(clips[i].filepath);
                            console.log("🗑️ File deleted : ", clips[i].filepath);
                            success = true
                            continue
                        }
                        if(cacheManager.textExistsInCache(clips[i].filepath)) {
                            console.log("File found in cache : ", clips[i].filepath);
                            success = true
                            continue
                        }
                        const verticalPath= await edit.convertToVertical(filepath);
                        await youtube.uploadShorts(verticalPath, clips[i].metadata.creatorUsername,clips[i].metadata.creatorUrl, clips[i].metadata.clipName, conf.youtube_channel);
                        cacheManager.writeToCache(clips[i].filepath)
                        fs.unlinkSync(verticalPath);
                        console.log("🗑️ Vertical file deleted : ", verticalPath);
                        success = true;
                        console.log(`✅ Successfully processed clip: ${clips[i].url}`);
                        
                    } catch (error) {
                        retryCount++;
                        if (retryCount <= maxRetries) {
                            console.error(`❌ Error processing clip (attempt ${retryCount}/${maxRetries}): ${clips[i].url}`);
                            console.error(error);
                        } else {
                            console.error(`❌ Failed to process clip after ${maxRetries} attempts: ${clips[i].url}`);
                            console.error(error);
                        }
                    }
                }
            }
            if(clips.length < 4 || conf.skipCompil) {
                return console.log('Compilation non crée', clips.length)
            }
            const folder = `./clips/${lang}/${category}`
            if(cacheManager.textExistsInCache(`${folder}/${new Date().toISOString().split('T')[0]}`)) {
                console.log("File found in cache : ", clips[i].filepath);
                success = true
                continue
            }
            await edit.concatVideosFromFolder(folder)
            console.log('Creation de la miniature de compilation..')
            const indexMinia = getIndexOfShortestTitleWithMinLength(clips)      
            await thumbnail.generateThumbnail(clips[indexMinia].title.trim().toUpperCase(), [
                clips[0].filepath,
                clips[1].filepath,
                clips[2].filepath,
                clips[3].filepath
            ], `${folder}/compilation.png`)
            console.log('Miniature crée')
            await youtube.uploadCompilation(clips, folder, clips[indexMinia].title.trim().toUpperCase(), conf.youtube_channel)
            cacheManager.writeToCache(`${folder}/${new Date().toISOString().split('T')[0]}`)
            fs.unlinkSync(folder);
            console.log("🗑️ Dossier supprimé : ", folder);
          
        } catch (categoryError) {
            console.error(`❌ Erreur pour la catégorie ${category} et langue ${lang}:`, categoryError);
        }
    }
}

start()

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getIndexOfShortestTitleWithMinLength(arr) {
    let index = 0;
    let shortestLength = Infinity;
  
    arr.forEach((item, i) => {
      if (item.title && item.title.length >= 4 && item.title.length < shortestLength) {
        shortestLength = item.title.length;
        index = i;
      }
    });
  
    return index;
}

