# Cahier des Charges - Extension VSCode "CodeAssist AI"

## 1. Présentation du projet

Développement d'une extension VSCode permettant d'intégrer un agent d'aide au code basé sur Claude 3.7 Sonnet, avec indexation vectorielle du code source pour fournir un contexte pertinent.

## 2. Fonctionnalités principales

- Authentification par clé API Claude
- Indexation vectorielle du code source
- Interface de chat intégrée à VSCode
- Récupération contextuelle de code
- Boutons d'action rapide (Apply, Create)
- Mémoire des conversations
- Intégration avec les fichiers ouverts

## 3. Architecture technique

L'extension sera développée en TypeScript et s'intégrera à l'API VSCode. Elle comprendra plusieurs composants principaux:

- Extension principale (activation, commandes, gestion des vues)
- Client API Claude (authentification, requêtes)
- Base de données vectorielle (indexation, recherche)
- Interface utilisateur (webview, interactions)
- Gestionnaire de mémoire (historique des conversations)

## 4. Composants clés

### 4.1 Gestion de l'API Claude

Module responsable de l'authentification avec l'API Claude et de l'envoi des requêtes:
- Stockage sécurisé de la clé API
- Formatage des requêtes avec contexte
- Gestion des réponses et des erreurs

### 4.2 Base de données vectorielle

Système d'indexation du code source:
- Analyse et vectorisation du code
- Stockage efficace des vecteurs
- Recherche sémantique pour trouver le code pertinent
- Mise à jour incrémentale de l'index

### 4.3 Interface utilisateur

Interface de chat intégrée à VSCode:
- Barre d'outils avec boutons d'action (Agent, Attach, @, Settings, Send)
- Zone de messages avec formatage du code
- Zone de saisie avec suggestions
- Boutons d'action rapide (Apply, Create)
- Thème adaptatif (clair/sombre)

### 4.4 Gestionnaire de mémoire

Système de gestion des conversations:
- Sauvegarde automatique des conversations
- Chargement des conversations précédentes
- Organisation par projet ou par thème
- Export/import des conversations

## 5. Fonctionnalités détaillées

### 5.1 Barre d'outils de l'agent

- Menu déroulant "Agent" pour sélectionner différents modes ou profils
- Bouton d'attachement de fichiers (📎)
- Bouton de mention de fichiers (@)
- Bouton de paramètres (⚙️)
- Bouton d'envoi (➤)

### 5.2 Boutons d'action rapide

- Bouton "Apply" pour appliquer directement les suggestions de code
- Bouton "Create" pour créer de nouveaux fichiers ou fonctions
- Options contextuelles supplémentaires (...)

### 5.3 Intégration avec l'éditeur

- Détection automatique du fichier actif
- Récupération du contexte de code actuel
- Sélection de code pour des questions spécifiques
- Application directe des modifications suggérées

### 5.4 Indexation intelligente

- Indexation automatique du workspace
- Filtres pour exclure certains fichiers ou dossiers
- Mise à jour incrémentale lors des modifications
- Priorisation des fichiers récemment modifiés

## 6. Configuration et paramètres

Options configurables:
- Clé API Claude
- Longueur maximale du contexte
- Thème de l'interface (clair, sombre, système)
- Sauvegarde automatique des conversations
- Dossiers à exclure de l'indexation
- Fréquence de mise à jour de l'index

## 7. Sécurité et confidentialité

- Stockage sécurisé de la clé API via l'API SecretStorage de VSCode
- Option pour limiter les fichiers indexés
- Politique claire sur les données envoyées à l'API Claude
- Option pour anonymiser certaines parties du code
- Conformité RGPD pour les utilisateurs européens

## 8. Planification

1. Configuration initiale du projet (1 semaine)
2. Implémentation de l'authentification Claude (1 semaine)
3. Développement de la base de données vectorielle (2 semaines)
4. Création de l'interface utilisateur de base (1 semaine)
5. Implémentation des boutons d'action rapide (1 semaine)
6. Développement du gestionnaire de mémoire (1 semaine)
7. Tests et optimisations (2 semaines)

## 9. Évolutions futures

- Support pour d'autres modèles d'IA
- Génération de code complète
- Intégration avec les systèmes de contrôle de version
- Suggestions proactives basées sur le contexte
- Personnalisation avancée de l'agent
- Mode hors ligne avec modèles locaux
- Collaboration en temps réel
- Intégration avec d'autres extensions VSCode