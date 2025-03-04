const { upload } = require('youtube-videos-uploader'); //vanilla javascript
require('dotenv/config')
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path; 
ffmpeg.setFfmpegPath(ffmpegStatic); // Utilisation de la version statique de FFmpeg
ffmpeg.setFfprobePath(ffprobePath);

async function uploadShorts(clipUrl, author, authorLink, clipName, channel) {
    try {
        const credentials = { email: process.env.YT_EMAIl, pass: process.env.YT_PASSWORD, recoveryemail: 'cartomagie.facile@gmail.com' }
        console.log('Uploading shorts youtube video...');
        const video = { path: clipUrl, title: `${author.toUpperCase()} ${clipName.trim().toUpperCase()}`, description:`Twitch: ${authorLink}`,  channelName: channel,  skipProcessingWait: true, onProgress: (progress) => { console.log('progress', progress) }, uploadAsDraft: false, isAgeRestriction: false, isNotForKid: false, publishType: 'PUBLIC', isChannelMonetized: false }
        await upload (credentials, [ video], {headless:false})
        console.log('Video short uploaded successfully');

    } catch (error) {
        console.error('Error during upload short:', error);
        throw error;
    }
}

async function uploadCompilation(clips, folder, title, channel) {
    try {
        const credentials = { email: process.env.YT_EMAIl, pass: process.env.YT_PASSWORD, recoveryemail: 'cartomagie.facile@gmail.com' }
        console.log('Uploading youtube compilation video...');
        const video = { path: `${folder}/compilation.mp4`, title: `BEST OF LOL: ${title}`, thumbnail:`${folder}/compilation.png`,channelName: channel, description:`${await generateTimeCodeFromClips(clips)}`, language: 'english', tags: ['video', 'league of legends'],   skipProcessingWait: true, onProgress: (progress) => { console.log('progress', progress) }, uploadAsDraft: false, isAgeRestriction: false, isNotForKid: false, publishType: 'PUBLIC', isChannelMonetized: false }
        await upload (credentials, [ video], {headless:true})
        console.log('Video compilation uploaded successfully');

    } catch (error) {
        console.error('Error during upload compilation:', error);
        throw error;
    }
}

// Fonction pour obtenir la durée d'une vidéo
async function getVideoDuration(filepath) {
    return new Promise((resolve, reject) => {
        const filePathResolved = path.resolve(filepath);
        console.log('Path resolved',filePathResolved )
        ffmpeg(filePathResolved)
            .ffprobe((err, metadata) => {
                if (err) {
                    reject(err);
                } else {
                    const duration = metadata.format.duration; // durée en secondes
                    resolve(duration);
                }
            });
    });
}



// Fonction pour générer les timecodes à partir des clips
async function generateTimeCodeFromClips(clips) {
    let description = '';
    let startTime = 0;

    for (let i = 0; i < clips.length; i++) {
        const clip = clips[i];
        const duration = await getVideoDuration(clips[i].filepath);  // Obtenir la durée de la vidéo

        const minutes = Math.floor(startTime / 60);
        const seconds = startTime % 60;
        const timeCode = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        // Ajouter le timecode à la description
        description += `${timeCode} - ${clip.description}\n`;

        description += `${timeCode} - ${clip.metadata.creatorUsername}: ${clip.title}\n`;

        // Ajouter la durée du clip à startTime pour le prochain timecode
        startTime += duration; // Durée en secondes
    }

    return description;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}



module.exports = { uploadShorts, uploadCompilation}; 