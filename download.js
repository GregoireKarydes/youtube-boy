const axios = require("axios");
const cliprxyz = require("cliprxyz");
const path = require("path");
const fs = require("fs");

async function getClipMetaData(clipUrl) {
    try {
        console.log("📡 Envoi de l'URL à clipr.xyz...");
        const metadata = await cliprxyz.downloadClip(clipUrl)
        return metadata
    } catch (error) {
        console.error("❌ Erreur lors de la récupération du lien :", error.message);
        throw error;
    }
}


async function downloadClip(clip, lang, category, index) {
    console.log("📥 Téléchargement du clip...", clip.metadata.clipUrl);

    const dirPath = path.join(__dirname, 'clips', lang, category);
    fs.mkdirSync(dirPath, { recursive: true });

    try {
        const response = await axios({
            url: clip.metadata.clipUrl,
            method: 'GET',
            responseType: 'stream'
        });

        if (response.status !== 200) {
            throw new Error(`Erreur lors du téléchargement : ${response.status}`);
        }

        const date = new Date().toISOString().split('T')[0];
        const cleanClipName = clip.metadata.clipName.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-');
        const fileName = `${date}-order-${index}-${clip.metadata.creatorUsername}-${cleanClipName}.mp4`;
        const filePath = path.join(dirPath, fileName);

        // Créez un stream d'écriture et gérez les erreurs
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        console.log(`✅ Clip téléchargé : ${filePath}`);
        return { filepath: filePath };
    } catch (error) {
        console.error('❌ Erreur lors du téléchargement du clip:', error);
        throw error;
    }
}

module.exports = {downloadClip, getClipMetaData};