const { upload } = require('youtube-videos-uploader'); //vanilla javascript
require('dotenv/config')


async function uploadClip(clipUrl, author, authorLink, clipName, lang) {
    try {
        const credentials = { email: process.env.YT_EMAIl, pass: process.env.YT_PASSWORD, recoveryemail: 'cartomagie.facile@gmail.com' }
        console.log('Uploading youtube video...');
        const video2 = { path: clipUrl, title: `${author} ${clipName.trim()}`, description:`Twitch: ${authorLink}`, language: 'english', tags: ['video', 'league of legends'],   skipProcessingWait: true, onProgress: (progress) => { console.log('progress', progress) }, uploadAsDraft: false, isAgeRestriction: false, isNotForKid: false, publishType: 'PUBLIC', isChannelMonetized: false }
        await upload (credentials, [ video2], {headless:false}).then(console.log)
        console.log('Video uploaded successfully');

    } catch (error) {
        console.error('Error during upload:', error);
        throw error;
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}



module.exports = { uploadClip }; 