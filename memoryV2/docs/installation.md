# 🚀 Guide d'installation Memory V2

## Prérequis

### Système
- **Node.js**: Version 18.0+ (recommandé: 20.x LTS)
- **npm**: Version 8.0+ ou **yarn**: Version 1.22+
- **Python**: Version 3.8+ (pour les modèles d'embedding)
- **Git**: Pour le clonage du repository

### Espace disque
- **Minimum**: 2GB d'espace libre
- **Recommandé**: 5GB+ (pour les modèles d'embedding et données)

### Mémoire
- **Minimum**: 4GB RAM
- **Recommandé**: 8GB+ RAM (pour les gros volumes de mémoires)

## Installation rapide

### 1. Clonage du projet
```bash
# Cloner le repository
git clone <repository-url>
cd plugin_vsc/memoryV2

# Installer les dépendances
npm install
```

### 2. Configuration initiale
```bash
# Copier la configuration par défaut
cp config/default.json.example config/default.json

# Configurer les variables d'environnement
cp .env.example .env
```

### 3. Installation des modèles d'embedding
```bash
# Installer les dépendances Python
pip install -r requirements.txt

# Télécharger le modèle par défaut
npm run setup:embeddings
```

### 4. Initialisation de la base de données
```bash
# Créer les répertoires de stockage
npm run setup:storage

# Initialiser la base de données vectorielle
npm run setup:vectordb
```

### 5. Démarrage du serveur
```bash
# Démarrage en mode développement
npm run dev

# Ou en mode production
npm run start
```

## Installation détaillée

### Configuration avancée

#### Fichier de configuration (`config/default.json`)
```json
{
  "server": {
    "port": 3000,
    "host": "localhost",
    "maxConnections": 100,
    "timeout": 30000,
    "cors": {
      "enabled": true,
      "origins": ["http://localhost:*", "vscode-webview://*"]
    }
  },
  "auth": {
    "enabled": true,
    "tokenExpiry": 3600,
    "allowedClients": ["vscode", "cursor", "claude-desktop", "windsurf"],
    "secretKey": "your-secret-key-here"
  },
  "vectorStore": {
    "provider": "chroma",
    "dimensions": 384,
    "similarity": "cosine",
    "storageDir": "./data/vectors",
    "maxVectors": 100000,
    "batchSize": 100
  },
  "embedding": {
    "model": "sentence-transformers/all-MiniLM-L6-v2",
    "provider": "local",
    "cacheSize": 1000,
    "timeout": 5000,
    "device": "cpu"
  },
  "memory": {
    "storageDir": "./data/memories",
    "maxMemorySize": 1000000,
    "compressionEnabled": true,
    "compressionThreshold": 500000,
    "backupEnabled": true,
    "backupInterval": 300000
  },
  "logging": {
    "level": "info",
    "format": "json",
    "file": "./logs/memory-v2.log",
    "maxSize": "10MB",
    "maxFiles": 5
  }
}
```

#### Variables d'environnement (`.env`)
```bash
# Serveur
NODE_ENV=development
PORT=3000
HOST=localhost

# Sécurité
SECRET_KEY=your-very-secure-secret-key
AUTH_ENABLED=true

# Base de données vectorielle
VECTOR_DB_URL=http://localhost:8000
VECTOR_DB_API_KEY=your-api-key

# Modèles d'embedding
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
EMBEDDING_DEVICE=cpu
HUGGINGFACE_TOKEN=your-hf-token

# Stockage
STORAGE_DIR=./data
BACKUP_DIR=./backups

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/memory-v2.log

# Performance
MAX_CONCURRENT_OPERATIONS=5
CACHE_SIZE=1000
```

### Installation des dépendances système

#### Ubuntu/Debian
```bash
# Mise à jour du système
sudo apt update && sudo apt upgrade -y

# Installation de Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Installation de Python et pip
sudo apt-get install -y python3 python3-pip python3-venv

# Installation des dépendances système pour les modèles ML
sudo apt-get install -y build-essential libssl-dev libffi-dev python3-dev
```

#### macOS
```bash
# Installation avec Homebrew
brew install node python@3.11

# Installation des outils de développement
xcode-select --install
```

#### Windows
```powershell
# Installation avec Chocolatey
choco install nodejs python

# Ou télécharger depuis les sites officiels:
# - Node.js: https://nodejs.org/
# - Python: https://python.org/
```

### Configuration de la base de données vectorielle

#### Option 1: Chroma (Recommandé pour le développement)
```bash
# Installation de Chroma
pip install chromadb

# Démarrage du serveur Chroma
chroma run --host localhost --port 8000
```

#### Option 2: Qdrant (Recommandé pour la production)
```bash
# Installation avec Docker
docker run -p 6333:6333 qdrant/qdrant

# Ou installation native
curl -L https://github.com/qdrant/qdrant/releases/latest/download/qdrant-x86_64-unknown-linux-gnu.tar.gz | tar xz
./qdrant
```

### Installation des modèles d'embedding

#### Modèle par défaut (all-MiniLM-L6-v2)
```bash
# Téléchargement automatique au premier démarrage
npm run setup:embeddings

# Ou téléchargement manuel
python -c "
from sentence_transformers import SentenceTransformer
model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
model.save('./models/all-MiniLM-L6-v2')
"
```

#### Modèles alternatifs
```bash
# Modèle multilingue
python -c "
from sentence_transformers import SentenceTransformer
model = SentenceTransformer('sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2')
model.save('./models/paraphrase-multilingual-MiniLM-L12-v2')
"

# Modèle haute performance (plus lourd)
python -c "
from sentence_transformers import SentenceTransformer
model = SentenceTransformer('sentence-transformers/all-mpnet-base-v2')
model.save('./models/all-mpnet-base-v2')
"
```

## Vérification de l'installation

### Tests de base
```bash
# Vérification des dépendances
npm run check:deps

# Tests unitaires
npm run test

# Tests d'intégration
npm run test:integration

# Test de performance
npm run test:performance
```

### Vérification du serveur MCP
```bash
# Démarrage du serveur
npm run dev

# Dans un autre terminal, test de connexion
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

### Vérification des embeddings
```bash
# Test de génération d'embedding
npm run test:embeddings

# Test de recherche vectorielle
npm run test:vector-search
```

## Dépannage

### Problèmes courants

#### Erreur de port déjà utilisé
```bash
# Trouver le processus utilisant le port
lsof -i :3000

# Tuer le processus
kill -9 <PID>

# Ou changer le port dans la configuration
```

#### Erreur de modèle d'embedding
```bash
# Vérifier l'installation de Python
python3 --version

# Réinstaller les dépendances Python
pip install -r requirements.txt --force-reinstall

# Télécharger manuellement le modèle
npm run setup:embeddings -- --force
```

#### Erreur de base de données vectorielle
```bash
# Vérifier que Chroma/Qdrant est démarré
curl http://localhost:8000/api/v1/collections

# Redémarrer la base de données
docker restart <container-id>
```

#### Problèmes de permissions
```bash
# Créer les répertoires avec les bonnes permissions
sudo mkdir -p ./data ./logs ./backups
sudo chown -R $USER:$USER ./data ./logs ./backups
chmod -R 755 ./data ./logs ./backups
```

### Logs de débogage
```bash
# Activer les logs détaillés
export LOG_LEVEL=debug
npm run dev

# Consulter les logs
tail -f ./logs/memory-v2.log

# Logs en temps réel avec formatage
npm run logs:watch
```

## Migration depuis Memory V1

### Sauvegarde des données V1
```bash
# Exporter les mémoires V1
npm run v1:export -- --output ./backup/memories-v1.json

# Vérifier l'export
npm run v1:validate -- --file ./backup/memories-v1.json
```

### Import vers V2
```bash
# Importer les données V1 vers V2
npm run v2:import -- --file ./backup/memories-v1.json

# Vérifier l'import
npm run v2:validate

# Générer les embeddings pour les mémoires importées
npm run v2:generate-embeddings
```

## Performance et optimisation

### Configuration pour gros volumes
```json
{
  "vectorStore": {
    "batchSize": 500,
    "maxVectors": 1000000
  },
  "embedding": {
    "cacheSize": 5000,
    "device": "cuda"
  },
  "memory": {
    "compressionEnabled": true,
    "compressionThreshold": 100000
  }
}
```

### Monitoring
```bash
# Démarrage avec monitoring
npm run start:monitor

# Dashboard de performance
open http://localhost:3001/dashboard
```
