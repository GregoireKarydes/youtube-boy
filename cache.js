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

  // Vérifier si un texte existe dans le cache
  textExistsInCache(text) {
    try {
      // Vérifier si le fichier existe
      if (!fs.existsSync(this.cachePath)) {
        return false;
      }
      
      // Lire le contenu du fichier
      const content = fs.readFileSync(this.cachePath, 'utf8');
      
      // Vérifier si le texte existe dans le contenu
      return content.includes(text);
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