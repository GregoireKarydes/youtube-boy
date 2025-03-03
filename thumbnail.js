const ffmpeg = require('fluent-ffmpeg');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');  // Pour manipuler les chemins de fichiers

async function generateThumbnail(title, videoPaths, outputPath) {
    // Extraire une image de chaque vidéo
    const images = [];
    for (let i = 0; i < videoPaths.length; i++) {
        const videoPath = videoPaths[i];
        const dir = path.dirname(videoPath);  // Obtenir le dossier de la vidéo
        const imagePath = path.join(dir, `frame_${i}.png`);  // Créer le chemin complet pour l'image temporaire
        await extractImageFromVideo(videoPath, imagePath, 1); // Extrait à 1 seconde
        images.push(imagePath);
    }

    // Charger les images extraites
    const loadedImages = await Promise.all(images.map(image => loadImage(image)));

    // Créer un canvas pour la miniature au format 16:9
    const canvas = createCanvas(1600, 900);  // Format 16:9
    const ctx = canvas.getContext('2d');

    // Ajouter un fond dégradé pour un look moderne
    const gradient = ctx.createLinearGradient(0, 0, 1600, 900);
    gradient.addColorStop(0, 'rgba(255, 0, 0, 0.8)');  // Rouge vif
    gradient.addColorStop(1, 'rgba(0, 0, 255, 0.8)');  // Bleu vibrant
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dessiner les images dans une grille 2x2
    const gridPositions = [
        { x: 0, y: 0 },
        { x: 800, y: 0 },
        { x: 0, y: 450 },
        { x: 800, y: 450 },
    ];

    loadedImages.forEach((img, idx) => {
        ctx.drawImage(img, gridPositions[idx].x, gridPositions[idx].y, 800, 450);  // Chaque image occupe 800x450 px
    });

    // Ajouter un titre centré au centre exact de l'image
    ctx.fillStyle = 'red';  // Titre en rouge
    ctx.font = 'bold 120px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Ajouter un contour blanc au texte
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'white';
    ctx.strokeText(title, canvas.width / 2, canvas.height / 2);  // Centré au milieu des images

    // Ajouter le texte en rouge au centre
    ctx.fillStyle = 'red';
    ctx.fillText(title, canvas.width / 2, canvas.height / 2);  // Centré au milieu des images

    // Sauvegarder la miniature
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);

    // Supprimer les fichiers temporaires des images extraites
    images.forEach(image => fs.unlinkSync(image));
}

function extractImageFromVideo(videoPath, outputPath, timeInSeconds) {
    return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
            .screenshots({
                timestamps: [timeInSeconds],
                filename: outputPath,
                folder: './',  // L'image sera sauvegardée dans le dossier de la vidéo
            })
            .on('end', resolve)
            .on('error', reject);
    });
}

module.exports = { generateThumbnail }
