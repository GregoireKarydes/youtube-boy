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
           console.log("💎 Number of unique clips ", clips.length);
           for (const clip of clips) {
            let retryCount = 0;
            const maxRetries = 5;
            const index = clips.findIndex(c => c.metadata.clipName === clip.metadata.clipName)
            let success = false;
        
            while (retryCount <= maxRetries && !success) {
                    try {
                        if (retryCount > 0) {
                            console.log(`Retry attempt ${retryCount} for clip: ${clip.url}`);
                            await sleep(5000); // Longer wait between retries
                        } else {
                            await sleep(2000);
                        }
                        
                        const { filepath } = await downloader.downloadClip(clip, clip.lang, clip.category, index);
                        clip.filepath = filepath;
                        if(conf.skipShort) {
                            console.log(`🚫 Skip shorts for ${category} for ${lang}`)
                            success = true
                            continue
                        }
                        if(config.BLACKLIST_AUTHOR.includes(clip.metadata.creatorUsername)) {
                            console.log(`🚫🔍 Banned author found ${clip.metadata.creatorUsername}`)
                            fs.unlinkSync(clip.filepath);
                            console.log("🗑️ File deleted : ", clip.filepath);
                            success = true
                            continue
                        }
                        if(cacheManager.textExistsInCache(clip.filepath)) {
                            console.log("🔍 File found in cache : ", clip.filepath);
                            success = true
                            continue
                        }
                        console.log('Editing in vertical format');
                        const verticalPath= await edit.convertToVertical(clip.filepath);
                        console.log('✅ Edited in vertical format');
                        await youtube.uploadShorts(verticalPath, clip.metadata.creatorUsername,clip.metadata.creatorUrl, clip.metadata.clipName, conf.youtube_channel);
                        cacheManager.writeToCache(clip.filepath)
                        fs.unlinkSync(verticalPath);
                        console.log("🗑️ Vertical file deleted : ", verticalPath);
                        success = true;
                        console.log(`✅ Successfully processed clip: ${clip.url}`);
                        
                    } catch (error) {
                        retryCount++;
                        if (retryCount <= maxRetries) {
                            console.error(`❌ Error processing clip (attempt ${retryCount}/${maxRetries}): ${clip.url}`);
                            console.error(error)
                        } else {
                            console.error(`❌ Failed to process clip after ${maxRetries} attempts: ${clip.url}`);
                            console.error(error);
                        }
                    }
            }
            }
            if(clips.length < 10 || conf.skipCompil) {
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
            fs.rmSync(folder);
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

