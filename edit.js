const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');

ffmpeg.setFfmpegPath(ffmpegStatic); // Utilisation de la version statique de FFmpeg

/**
 * Convertit une vidéo en format vertical et écrase le fichier d'origine.
 * @param {string} inputPath - Chemin de la vidéo à convertir.
 * @returns {Promise<void>} - Une promesse qui se résout lorsque la conversion est terminée.
 */
async function convertToVertical(inputPath) {
    await sleep(3000);
    
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Erreur : Le fichier "${inputPath}" n'existe pas.`);
    }
  
    // Create output path with -v.mp4 suffix
    const outputPath = inputPath.replace('.mp4', '-v.mp4');
    const tempPath = `${outputPath}.temp.mp4`; // Temporary file
  
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .format('mp4')
        .size('1080x1920') // Vertical Full HD format
        .aspect('9:16')
        .autopad(true, 'black') // Add black bars if necessary
        .on('progress', (progress) => {
          if (progress?.percent) {
            console.log(`Progression : ${progress.percent.toFixed(2)}%`);
          }
        })
        .on('end', () => {
          try {
            fs.renameSync(tempPath, outputPath); // Rename temp file to final output file with -v.mp4 suffix
            console.log(`Conversion terminée : ${outputPath}`);
            resolve(outputPath); // Return the new output path
          } catch (error) {
            reject(error);
          }
        })
        .on('error', (err) => {
          console.error('Erreur :', err);
          if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath); // Delete temp file in case of error
          }
          reject(err);
        })
        .save(tempPath);
    });
  }

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


/**
 * Récupère tous les fichiers vidéo d'un dossier donné, triés par nom.
 * @param {string} folderPath - Chemin du dossier contenant les vidéos.
 * @returns {string[]} - Liste des chemins des fichiers vidéo.
 */
function getVideoFiles(folderPath) {
  return fs.readdirSync(folderPath)
      .filter(file => file.endsWith('.mp4')) // Filtre les fichiers vidéo (.mp4)
      .map(file => path.join(folderPath, file)) // Convertit en chemins complets
      .sort(); // Trie par nom
}

/**
* Concatène toutes les vidéos d'un dossier en une seule compilation.
* @param {string} folderPath - Dossier contenant les vidéos.
* @returns {Promise<void>} - Une promesse qui se résout quand la compilation est terminée.
*/
async function concatVideosFromFolder(folderPath) {
  console.log(`📂 Récupération des vidéos dans : ${folderPath}`);

  const videos = getVideoFiles(folderPath);
  
  if (videos.length === 0) {
      console.error('❌ Aucun fichier vidéo trouvé !');
      return;
  }

  console.log(`📜 ${videos.length} fichiers trouvés. Création du fichier de liste...`);
  
  const listFile = path.resolve(folderPath, 'fileList.txt');
  const outputFile = path.resolve(folderPath, 'compilation.mp4'); // Crée la compilation dans le même dossier

  console.log(`✅ Fichier fileList.txt créé : ${listFile}`);
  console.log(`📂 Contenu du dossier :`, fs.readdirSync(folderPath));


  fs.writeFileSync(listFile, videos.map(video => `file '${path.resolve(video).replace(/\\/g, '/')}'`).join('\n'), { encoding: 'utf8' });


  await sleep(1000)

  return new Promise((resolve, reject) => {
      ffmpeg()
          .input(listFile)
          .inputOptions(['-f concat', '-safe 0'])
          .output(outputFile)
          .outputOptions('-c copy')
          .on('end', () => {
              console.log(`🎬 Compilation terminée : ${outputFile}`);
              fs.unlinkSync(listFile); // Nettoyage du fichier temporaire
              resolve();
          })
          .on('error', (err) => {
              console.error('❌ Erreur lors de la compilation :', err);
              reject(err);
          })
          .run();
  });
}




module.exports = {convertToVertical, concatVideosFromFolder};
