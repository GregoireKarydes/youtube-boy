const config = require('./config').CONFIG
const twitch = require('./twitch')
const downloadClip = require('./download')
const edit = require('./edit')
const youtube = require('./youtube')
const fs = require("fs");
const thumbnail = require('./thumbnail')

async function start() {
    for (let conf of config) {
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
                        
                        const { filepath, metadata } = await downloadClip(clips[i].url, clips[i].lang, clips[i].category, i);
                        clips[i].filepath = filepath;
                        clips[i].metadata = metadata;
                        console.log('Editing in vertical format');
                        const verticalPath= await edit.convertToVertical(filepath);
                        await youtube.uploadShorts(verticalPath, clips[i].metadata.creatorUsername,clips[i].metadata.creatorUrl, clips[i].metadata.clipName);
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
            if(clips.length < 4) {
                return console.log('Compilation non crée, pas assez de videos', clips.length)
            }
            const folder = `./clips/${lang}/${category}`
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
            await youtube.uploadCompilation(clips, folder, clips[indexMinia].title.trim().toUpperCase())
            // fs.unlinkSync(folder);
            // console.log("🗑️ Dossier supprimé : ", folder);
          
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