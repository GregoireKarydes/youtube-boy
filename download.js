const axios = require("axios");
const cliprxyz = require("cliprxyz");
const path = require("path");
const fs = require("fs");

async function getClipMetaData(clipUrl) {
    try {
        console.log("📡 Envoi de l'URL à clipr.xyz...");
        const clip = await cliprxyz.downloadClip(clipUrl)
        return clip
    } catch (error) {
        console.error("❌ Erreur lors de la récupération du lien :", error.message);
        throw error;
    }
}

async function downloadClip(clipUrl, lang, category, index) {
    const metadata = await getClipMetaData(clipUrl);
    console.log("📥 Téléchargement du clip...");

    const dirPath = path.join(__dirname, 'clips', lang, category);
    fs.mkdirSync(dirPath, { recursive: true });

    const response = await axios({
        url: metadata.clipUrl,
        method: 'GET',
        responseType: 'stream'
    });

    const date = new Date().toISOString().split('T')[0];
    const cleanClipName = metadata.clipName.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-');
    const fileName = `${date}-order-${index}-${metadata.creatorUsername}-${cleanClipName}.mp4`;
    const filePath = path.join(dirPath, fileName);

    // Pipe the response stream into the file
    await response.data.pipe(fs.createWriteStream(filePath));

    console.log(`✅ Clip téléchargé : ${filePath}`);
    return { filepath: filePath, metadata };
}

module.exports = downloadClip;