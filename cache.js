const fs = require('fs');
const path = require('path');

class CacheManager {
  constructor(cachePath = './cache.txt') {
    this.cachePath = cachePath;
  }

  // Créer le fichier de cache s'il n'existe pas
  ensureCache() {
    try {
      if (!fs.existsSync(this.cachePath)) {
        fs.writeFileSync(this.cachePath, '', 'utf8');
        console.log(`Fichier de cache créé: ${this.cachePath}`);
        return true;
      }
      return false; // le fichier existait déjà
    } catch (error) {
      console.error(`Erreur lors de la création du fichier de cache: ${error.message}`);
      throw error;
    }
  }

  // Écrire du contenu dans le fichier de cache
  writeToCache(content) {
    try {
      // Assurer que le fichier existe
      this.ensureCache();
      
      // Ajouter le contenu à une nouvelle ligne
      fs.appendFileSync(this.cachePath, content + '\n', 'utf8');
      console.log(`Contenu ajouté au cache: ${content}`);
      return true;
    } catch (error) {
      console.error(`Erreur lors de l'écriture dans le cache: ${error.message}`);
      return false;
    }
  }

  textExistsInCache(text) {
    try {
        if (!fs.existsSync(this.cachePath)) {
            return false;
        }

        const content = fs.readFileSync(this.cachePath, 'utf8');
        const normalizedText = text.replace(/-order-\d+-/, '-order-').replace(/\\/g, '/'); // Supprime le numéro et corrige les slashes

        const lines = content.split('\n').map(line => line.trim());
        const normalizedLines = lines
            .map(line => line.replace(/-order-\d+-/, '-order-').replace(/\\/g, '/')); // Applique les mêmes changements

        return normalizedLines.includes(normalizedText);
    } catch (error) {
        console.error(`Erreur lors de la lecture du cache: ${error.message}`);
        return false;
    }
}


  
  

  // Lire tout le contenu du cache
  readCache() {
    try {
      // Vérifier si le fichier existe
      if (!fs.existsSync(this.cachePath)) {
        return '';
      }
      
      // Lire et retourner le contenu du fichier
      return fs.readFileSync(this.cachePath, 'utf8');
    } catch (error) {
      console.error(`Erreur lors de la lecture du cache: ${error.message}`);
      return '';
    }
  }

  // Vider complètement le cache
  clearCache() {
    try {
      fs.writeFileSync(this.cachePath, '', 'utf8');
      console.log('Cache vidé avec succès');
      return true;
    } catch (error) {
      console.error(`Erreur lors du vidage du cache: ${error.message}`);
      return false;
    }
  }
}

module.exports = CacheManager;