const config = require('./config').CONFIG
const twitch = require('./twitch')
const downloadClip = require('./download')
const edit = require('./edit')
const youtube = require('./youtube')
const fs = require("fs");

async function start() {
    for (let conf of config) {
        const lang = conf.lang;
        const category = conf.category;
        console.log('🔗 Lang : ', lang);
        console.log('🎥 Video : ', category);
        if (conf.skip) {
            console.log(`🚫 Skipping ${category} for ${lang}`);
            continue;
        }
        if (!conf.youtube_channel) {
            console.log(`🚫 No youtube channel for ${category} for ${lang}`)
            continue;
        }
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
                        console.log('Meta', clips[i].metadata)
                        console.log('Author name:', clips[i].metadata.creatorUserName)
                        console.log('Author url:', clips[i].metadata.creatorUrl)
                        console.log('Editing in vertical format');
                        const verticalPath= await edit.convertToVertical(filepath);
                        await youtube.uploadClip(verticalPath, clips[i].metadata.creatorUsername,clips[i].metadata.creatorUrl, clips[i].metadata.clipName);
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
            const folder = `./clips/${lang}/${category}`
            await edit.concatVideosFromFolder(folder)
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