# 🎯 TÂCHE 2 : SYSTÈME D'AGENT MENTION (@)

## 📋 **Vue d'Ensemble**

Implémentation d'un système de mention d'agents spécialisés avec le symbole @, permettant aux utilisateurs de sélectionner des agents IA spécialisés pour différents types de tâches de développement.

## 🎯 **Objectifs Principaux**

- ✅ **Détection automatique** du caractère @ dans l'input
- ✅ **Dropdown d'agents** avec auto-complétion
- ✅ **Agents spécialisés** prédéfinis (@code, @debug, @test, etc.)
- ✅ **Configuration d'agents** personnalisés
- ✅ **Historique par agent** avec filtrage
- ✅ **Indicateurs visuels** de l'agent actif

## 🏗️ **Architecture Technique**

### **Modules à Créer :**

#### **1. AgentManager (src/agents/agentManager.ts)**
```typescript
interface IAgent {
  id: string;
  name: string;
  displayName: string;
  description: string;
  avatar: string;
  specialization: string[];
  prompt: string;
  systemPrompt: string;
  examples: IAgentExample[];
  config: IAgentConfig;
}

interface IAgentConfig {
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
}

class AgentManager {
  // Gestion des agents prédéfinis et personnalisés
  // Sélection et activation d'agents
  // Configuration et personnalisation
  // Historique des interactions
}
```

#### **2. AgentSelector (src/agents/agentSelector.ts)**
```typescript
class AgentSelector {
  // Interface de sélection d'agent
  // Auto-complétion avec @
  // Dropdown avec recherche
  // Prévisualisation d'agent
}
```

#### **3. AgentHistory (src/agents/agentHistory.ts)**
```typescript
class AgentHistory {
  // Historique par agent
  // Filtrage et recherche
  // Statistiques d'utilisation
  // Export/Import d'historique
}
```

## 🎨 **Interface Utilisateur**

### **Input avec Mention d'Agent**

```
┌─────────────────────────────────────────────────┐
│ 💬 Chat with AI                               │
├─────────────────────────────────────────────────┤
│ @code create a TypeScript interface for User   │
│ ┌─────────────────────────────────────────────┐ │
│ │ 🤖 @code - Code Generation Specialist      │ │
│ │ 🐛 @debug - Debugging & Error Fixing       │ │
│ │ 🔧 @refactor - Code Refactoring Expert     │ │
│ │ 🧪 @test - Unit Testing Specialist         │ │
│ │ 📚 @doc - Documentation Generator          │ │
│ │ 👀 @review - Code Review Assistant         │ │
│ │ 🔒 @security - Security Analysis Expert    │ │
│ │ ⚡ @performance - Performance Optimizer     │ │
│ └─────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────┤
│ 🤖 Active Agent: @code                         │
│ Specialized in: TypeScript, React, Node.js     │
└─────────────────────────────────────────────────┘
```

### **Panneau de Configuration d'Agents**

```
┌─────────────────────────────────────┐
│ 🤖 Agent Configuration             │
├─────────────────────────────────────┤
│ [Predefined] [Custom] [History]     │
├─────────────────────────────────────┤
│ 🤖 @code                           │
│   Name: Code Generation Specialist │
│   Specialization: [TypeScript ▼]   │
│   Temperature: [0.7        ]       │
│   Max Tokens: [2048        ]       │
│   ┌─────────────────────────────┐   │
│   │ System Prompt:              │   │
│   │ You are a code generation   │   │
│   │ specialist focused on...    │   │
│   └─────────────────────────────┘   │
│   [Edit] [Duplicate] [Delete]       │
├─────────────────────────────────────┤
│ [+ Create Custom Agent]             │
└─────────────────────────────────────┘
```

## 🔧 **Implémentation Détaillée**

### **Étape 1 : Types et Configuration**

#### **1.1 Types d'Agents**
```typescript
// src/agents/types.ts
export interface IAgent {
  id: string;
  name: string; // @code, @debug, etc.
  displayName: string; // "Code Generation Specialist"
  description: string;
  avatar: string; // emoji ou icône
  specialization: string[]; // ["TypeScript", "React", "Node.js"]
  prompt: string; // Prompt principal
  systemPrompt: string; // Instructions système
  examples: IAgentExample[];
  config: IAgentConfig;
  isCustom: boolean;
  createdAt: Date;
  lastUsed?: Date;
  usageCount: number;
}

export interface IAgentExample {
  input: string;
  output: string;
  description: string;
}

export interface IAgentConfig {
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  stopSequences?: string[];
}

export interface IAgentInteraction {
  id: string;
  agentId: string;
  input: string;
  output: string;
  timestamp: Date;
  duration: number;
  tokens: number;
  rating?: number;
}
```

#### **1.2 Agents Prédéfinis**
```typescript
// src/agents/predefinedAgents.ts
export const PREDEFINED_AGENTS: IAgent[] = [
  {
    id: 'code',
    name: '@code',
    displayName: 'Code Generation Specialist',
    description: 'Expert in generating clean, efficient code',
    avatar: '🤖',
    specialization: ['TypeScript', 'JavaScript', 'React', 'Node.js'],
    prompt: `You are a code generation specialist. Focus on:
- Writing clean, readable code
- Following best practices
- Adding appropriate comments
- Using modern syntax and patterns`,
    systemPrompt: 'Generate high-quality code with proper structure and documentation.',
    examples: [
      {
        input: 'Create a TypeScript interface for User',
        output: `interface IUser {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  isActive: boolean;
}`,
        description: 'Basic interface creation'
      }
    ],
    config: {
      temperature: 0.7,
      maxTokens: 2048,
      topP: 0.9,
      frequencyPenalty: 0.1,
      presencePenalty: 0.1
    },
    isCustom: false,
    createdAt: new Date(),
    usageCount: 0
  },

  {
    id: 'debug',
    name: '@debug',
    displayName: 'Debugging & Error Fixing',
    description: 'Specialist in finding and fixing bugs',
    avatar: '🐛',
    specialization: ['Debugging', 'Error Analysis', 'Testing'],
    prompt: `You are a debugging specialist. Focus on:
- Identifying root causes of issues
- Providing step-by-step solutions
- Suggesting preventive measures
- Explaining error messages clearly`,
    systemPrompt: 'Help debug code issues with detailed analysis and solutions.',
    examples: [],
    config: {
      temperature: 0.3,
      maxTokens: 1536,
      topP: 0.8,
      frequencyPenalty: 0.2,
      presencePenalty: 0.1
    },
    isCustom: false,
    createdAt: new Date(),
    usageCount: 0
  },

  {
    id: 'test',
    name: '@test',
    displayName: 'Unit Testing Specialist',
    description: 'Expert in creating comprehensive tests',
    avatar: '🧪',
    specialization: ['Jest', 'Testing Library', 'Unit Tests', 'Integration Tests'],
    prompt: `You are a testing specialist. Focus on:
- Writing comprehensive unit tests
- Following testing best practices
- Creating descriptive test names
- Covering edge cases and error scenarios`,
    systemPrompt: 'Generate thorough test suites with good coverage.',
    examples: [],
    config: {
      temperature: 0.5,
      maxTokens: 2048,
      topP: 0.9,
      frequencyPenalty: 0.1,
      presencePenalty: 0.1
    },
    isCustom: false,
    createdAt: new Date(),
    usageCount: 0
  },

  {
    id: 'refactor',
    name: '@refactor',
    displayName: 'Code Refactoring Expert',
    description: 'Specialist in improving code structure',
    avatar: '🔧',
    specialization: ['Refactoring', 'Code Quality', 'Design Patterns'],
    prompt: `You are a refactoring specialist. Focus on:
- Improving code structure and readability
- Applying design patterns appropriately
- Reducing code duplication
- Enhancing maintainability`,
    systemPrompt: 'Refactor code to improve quality while preserving functionality.',
    examples: [],
    config: {
      temperature: 0.6,
      maxTokens: 2048,
      topP: 0.9,
      frequencyPenalty: 0.1,
      presencePenalty: 0.1
    },
    isCustom: false,
    createdAt: new Date(),
    usageCount: 0
  }
];
```

### **Étape 2 : AgentManager Core**

#### **2.1 Gestion des Agents**
```typescript
// src/agents/agentManager.ts
export class AgentManager {
  private agents: Map<string, IAgent> = new Map();
  private activeAgent: IAgent | null = null;
  private storageService: IStorageService;
  private historyService: AgentHistory;

  constructor(storageService: IStorageService) {
    this.storageService = storageService;
    this.historyService = new AgentHistory(storageService);
    this.loadAgents();
  }

  async loadAgents(): Promise<void> {
    // Charger agents prédéfinis
    PREDEFINED_AGENTS.forEach(agent => {
      this.agents.set(agent.id, agent);
    });

    // Charger agents personnalisés
    const customAgents = await this.storageService.get('customAgents', []);
    customAgents.forEach((agent: IAgent) => {
      this.agents.set(agent.id, agent);
    });
  }

  getAgent(id: string): IAgent | undefined {
    return this.agents.get(id);
  }

  getAllAgents(): IAgent[] {
    return Array.from(this.agents.values());
  }

  getAgentsBySpecialization(specialization: string): IAgent[] {
    return this.getAllAgents().filter(agent =>
      agent.specialization.includes(specialization)
    );
  }

  async setActiveAgent(agentId: string): Promise<void> {
    const agent = this.getAgent(agentId);
    if (agent) {
      this.activeAgent = agent;
      agent.lastUsed = new Date();
      agent.usageCount++;
      await this.saveAgents();
    }
  }

  getActiveAgent(): IAgent | null {
    return this.activeAgent;
  }

  async createCustomAgent(agentData: Omit<IAgent, 'id' | 'isCustom' | 'createdAt' | 'usageCount'>): Promise<string> {
    const agent: IAgent = {
      ...agentData,
      id: this.generateAgentId(),
      isCustom: true,
      createdAt: new Date(),
      usageCount: 0
    };

    this.agents.set(agent.id, agent);
    await this.saveAgents();
    return agent.id;
  }

  async updateAgent(id: string, updates: Partial<IAgent>): Promise<void> {
    const agent = this.agents.get(id);
    if (agent && agent.isCustom) {
      Object.assign(agent, updates);
      await this.saveAgents();
    }
  }

  async deleteAgent(id: string): Promise<void> {
    const agent = this.agents.get(id);
    if (agent && agent.isCustom) {
      this.agents.delete(id);
      await this.saveAgents();
    }
  }

  searchAgents(query: string): IAgent[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllAgents().filter(agent =>
      agent.name.toLowerCase().includes(lowerQuery) ||
      agent.displayName.toLowerCase().includes(lowerQuery) ||
      agent.description.toLowerCase().includes(lowerQuery) ||
      agent.specialization.some(spec =>
        spec.toLowerCase().includes(lowerQuery)
      )
    );
  }

  private generateAgentId(): string {
    return `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async saveAgents(): Promise<void> {
    const customAgents = this.getAllAgents().filter(agent => agent.isCustom);
    await this.storageService.set('customAgents', customAgents);
  }
}
```

### **Étape 3 : Interface de Sélection**

#### **3.1 Agent Selector Component**
```typescript
// src/agents/agentSelector.ts
export class AgentSelector {
  private agentManager: AgentManager;
  private inputElement: HTMLTextAreaElement;
  private dropdownElement: HTMLElement;
  private isDropdownVisible: boolean = false;
  private selectedIndex: number = -1;

  constructor(agentManager: AgentManager, inputElement: HTMLTextAreaElement) {
    this.agentManager = agentManager;
    this.inputElement = inputElement;
    this.createDropdown();
    this.setupEventListeners();
  }

  private createDropdown(): void {
    this.dropdownElement = document.createElement('div');
    this.dropdownElement.className = 'agent-dropdown';
    this.dropdownElement.style.display = 'none';

    // Positionner le dropdown
    const inputRect = this.inputElement.getBoundingClientRect();
    this.dropdownElement.style.position = 'absolute';
    this.dropdownElement.style.top = `${inputRect.bottom + 5}px`;
    this.dropdownElement.style.left = `${inputRect.left}px`;
    this.dropdownElement.style.width = `${inputRect.width}px`;

    document.body.appendChild(this.dropdownElement);
  }

  private setupEventListeners(): void {
    this.inputElement.addEventListener('input', this.handleInput.bind(this));
    this.inputElement.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('click', this.handleDocumentClick.bind(this));
  }

  private handleInput(event: Event): void {
    const input = event.target as HTMLTextAreaElement;
    const cursorPosition = input.selectionStart;
    const textBeforeCursor = input.value.substring(0, cursorPosition);

    // Détecter mention d'agent (@)
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      const query = mentionMatch[1];
      this.showAgentDropdown(query);
    } else {
      this.hideDropdown();
    }
  }

  private showAgentDropdown(query: string): void {
    const agents = query
      ? this.agentManager.searchAgents(query)
      : this.agentManager.getAllAgents();

    if (agents.length === 0) {
      this.hideDropdown();
      return;
    }

    this.renderAgentList(agents);
    this.dropdownElement.style.display = 'block';
    this.isDropdownVisible = true;
    this.selectedIndex = -1;
  }

  private renderAgentList(agents: IAgent[]): void {
    this.dropdownElement.innerHTML = agents.map((agent, index) => `
      <div class="agent-option" data-index="${index}" data-agent-id="${agent.id}">
        <div class="agent-avatar">${agent.avatar}</div>
        <div class="agent-info">
          <div class="agent-name">${agent.displayName}</div>
          <div class="agent-description">${agent.description}</div>
          <div class="agent-specialization">
            ${agent.specialization.slice(0, 3).map(spec =>
              `<span class="spec-tag">${spec}</span>`
            ).join('')}
          </div>
        </div>
        <div class="agent-shortcut">${agent.name}</div>
      </div>
    `).join('');

    // Ajouter event listeners pour les options
    this.dropdownElement.querySelectorAll('.agent-option').forEach((option, index) => {
      option.addEventListener('click', () => this.selectAgent(agents[index]));
      option.addEventListener('mouseenter', () => this.highlightOption(index));
    });
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.isDropdownVisible) return;

    const options = this.dropdownElement.querySelectorAll('.agent-option');

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, options.length - 1);
        this.highlightOption(this.selectedIndex);
        break;

      case 'ArrowUp':
        event.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
        this.highlightOption(this.selectedIndex);
        break;

      case 'Enter':
      case 'Tab':
        event.preventDefault();
        if (this.selectedIndex >= 0) {
          const agentId = options[this.selectedIndex].getAttribute('data-agent-id');
          const agent = this.agentManager.getAgent(agentId!);
          if (agent) {
            this.selectAgent(agent);
          }
        }
        break;

      case 'Escape':
        this.hideDropdown();
        break;
    }
  }

  private highlightOption(index: number): void {
    const options = this.dropdownElement.querySelectorAll('.agent-option');
    options.forEach((option, i) => {
      option.classList.toggle('highlighted', i === index);
    });
  }

  private selectAgent(agent: IAgent): void {
    // Remplacer la mention @ par le nom de l'agent
    const cursorPosition = this.inputElement.selectionStart;
    const textBeforeCursor = this.inputElement.value.substring(0, cursorPosition);
    const textAfterCursor = this.inputElement.value.substring(cursorPosition);

    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    if (mentionMatch) {
      const beforeMention = textBeforeCursor.substring(0, mentionMatch.index);
      this.inputElement.value = beforeMention + agent.name + ' ' + textAfterCursor;

      // Positionner le curseur après le nom de l'agent
      const newPosition = beforeMention.length + agent.name.length + 1;
      this.inputElement.setSelectionRange(newPosition, newPosition);
    }

    // Activer l'agent
    this.agentManager.setActiveAgent(agent.id);

    // Émettre événement de sélection
    this.inputElement.dispatchEvent(new CustomEvent('agentSelected', {
      detail: { agent }
    }));

    this.hideDropdown();
    this.inputElement.focus();
  }

  private hideDropdown(): void {
    this.dropdownElement.style.display = 'none';
    this.isDropdownVisible = false;
    this.selectedIndex = -1;
  }

  private handleDocumentClick(event: Event): void {
    const target = event.target as Element;
    if (!this.dropdownElement.contains(target) && target !== this.inputElement) {
      this.hideDropdown();
    }
  }

  dispose(): void {
    if (this.dropdownElement.parentNode) {
      this.dropdownElement.parentNode.removeChild(this.dropdownElement);
    }
  }
}
```

### **Étape 4 : Intégration dans ChatWebview**

#### **4.1 Modification du ChatWebview**
```typescript
// src/webview/chatWebview.ts - Ajouts
export class ChatWebview {
  private agentManager: AgentManager;
  private agentSelector: AgentSelector;

  constructor(context: vscode.ExtensionContext) {
    // ... existing code ...
    this.agentManager = new AgentManager(this.storageService);
    this.setupAgentSelector();
  }

  private setupAgentSelector(): void {
    // Attendre que la webview soit prête
    this.webviewPanel.webview.onDidReceiveMessage(async (message) => {
      if (message.type === 'webviewReady') {
        // Injecter le script de sélection d'agent
        await this.webviewPanel.webview.postMessage({
          type: 'initAgentSelector',
          payload: {
            agents: this.agentManager.getAllAgents(),
            activeAgent: this.agentManager.getActiveAgent()
          }
        });
      }
    });
  }

  private async handleMessage(message: any): Promise<void> {
    switch (message.type) {
      case 'agentSelected':
        await this.handleAgentSelection(message.payload);
        break;

      case 'getAgents':
        await this.handleGetAgents(message.payload);
        break;

      // ... existing cases ...
    }
  }

  private async handleAgentSelection(payload: any): Promise<void> {
    const { agentId } = payload;
    await this.agentManager.setActiveAgent(agentId);

    // Mettre à jour l'interface
    await this.webviewPanel.webview.postMessage({
      type: 'agentActivated',
      payload: {
        agent: this.agentManager.getActiveAgent()
      }
    });
  }

  private async handleGetAgents(payload: any): Promise<void> {
    const { query } = payload;
    const agents = query
      ? this.agentManager.searchAgents(query)
      : this.agentManager.getAllAgents();

    await this.webviewPanel.webview.postMessage({
      type: 'agentsResponse',
      payload: { agents }
    });
  }

  protected getHtmlContent(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Code Assistant AI</title>
        <style>
          ${this.getCssContent()}
          ${this.getAgentSelectorCss()}
        </style>
      </head>
      <body>
        <div class="chat-container">
          <!-- Agent indicator -->
          <div class="agent-indicator" id="agent-indicator" style="display: none;">
            <span class="agent-avatar" id="agent-avatar">🤖</span>
            <div class="agent-info">
              <span class="agent-name" id="agent-name">No agent selected</span>
              <span class="agent-specialization" id="agent-specialization"></span>
            </div>
          </div>

          <!-- Existing chat content -->
          <div class="messages-container" id="messages-container">
            <!-- Messages will be inserted here -->
          </div>

          <div class="input-container">
            <textarea
              id="message-input"
              placeholder="Type @ to mention an agent, then your message..."
              rows="3"
            ></textarea>
            <button id="send-button">Send</button>
          </div>
        </div>

        <script>
          ${this.getAgentSelectorScript()}
          ${this.getExistingScript()}
        </script>
      </body>
      </html>
    `;
  }

  private getAgentSelectorCss(): string {
    return `
      .agent-dropdown {
        background: var(--vscode-dropdown-background);
        border: 1px solid var(--vscode-dropdown-border);
        border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        max-height: 300px;
        overflow-y: auto;
        z-index: 1000;
      }

      .agent-option {
        display: flex;
        align-items: center;
        padding: 8px 12px;
        cursor: pointer;
        border-bottom: 1px solid var(--vscode-dropdown-border);
      }

      .agent-option:hover,
      .agent-option.highlighted {
        background: var(--vscode-list-hoverBackground);
      }

      .agent-avatar {
        font-size: 20px;
        margin-right: 12px;
        width: 24px;
        text-align: center;
      }

      .agent-info {
        flex: 1;
        min-width: 0;
      }

      .agent-name {
        font-weight: 600;
        color: var(--vscode-foreground);
        display: block;
        margin-bottom: 2px;
      }

      .agent-description {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
        margin-bottom: 4px;
      }

      .agent-specialization {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
      }

      .spec-tag {
        background: var(--vscode-badge-background);
        color: var(--vscode-badge-foreground);
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 10px;
      }

      .agent-shortcut {
        font-family: monospace;
        font-size: 12px;
        color: var(--vscode-textLink-foreground);
        margin-left: 8px;
      }

      .agent-indicator {
        display: flex;
        align-items: center;
        padding: 8px 12px;
        background: var(--vscode-editor-background);
        border: 1px solid var(--vscode-panel-border);
        border-radius: 6px;
        margin-bottom: 12px;
      }

      .agent-indicator .agent-avatar {
        font-size: 18px;
        margin-right: 10px;
      }

      .agent-indicator .agent-info {
        flex: 1;
      }

      .agent-indicator .agent-name {
        font-weight: 600;
        color: var(--vscode-foreground);
        display: block;
      }

      .agent-indicator .agent-specialization {
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
      }
    `;
  }
}
```

## 🧪 **Tests et Validation**

### **Tests Fonctionnels**
- [ ] **Détection du @** dans l'input
- [ ] **Auto-complétion** des agents
- [ ] **Sélection par clavier** (flèches, Enter)
- [ ] **Sélection par souris**
- [ ] **Activation d'agent** et indicateur visuel
- [ ] **Recherche d'agents** par nom/spécialisation

### **Tests de Performance**
- [ ] **Réactivité** de l'auto-complétion (< 100ms)
- [ ] **Rendu** du dropdown (< 50ms)
- [ ] **Recherche** dans liste d'agents (< 200ms)

### **Tests d'Intégration**
- [ ] **Persistance** de l'agent actif
- [ ] **Historique** par agent
- [ ] **Configuration** d'agents personnalisés

## 🎯 **Critères de Succès**

- ✅ **Détection instantanée** du caractère @
- ✅ **Auto-complétion fluide** avec < 100ms de latence
- ✅ **Navigation clavier** complète et intuitive
- ✅ **Agents spécialisés** fonctionnels avec prompts optimisés
- ✅ **Interface moderne** et accessible

Cette implémentation créera un système de mention d'agents révolutionnaire, permettant aux utilisateurs de sélectionner facilement des spécialistes IA pour chaque type de tâche !

## 📝 **Script JavaScript pour la Webview**

```javascript
// Agent Selector Script pour la webview
class WebviewAgentSelector {
  constructor() {
    this.agents = [];
    this.activeAgent = null;
    this.isDropdownVisible = false;
    this.selectedIndex = -1;
    this.init();
  }

  init() {
    this.inputElement = document.getElementById('message-input');
    this.createDropdown();
    this.setupEventListeners();

    // Écouter les messages de l'extension
    window.addEventListener('message', this.handleExtensionMessage.bind(this));

    // Signaler que la webview est prête
    this.postMessage('webviewReady', {});
  }

  createDropdown() {
    this.dropdownElement = document.createElement('div');
    this.dropdownElement.className = 'agent-dropdown';
    this.dropdownElement.style.display = 'none';
    document.body.appendChild(this.dropdownElement);
  }

  setupEventListeners() {
    this.inputElement.addEventListener('input', this.handleInput.bind(this));
    this.inputElement.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('click', this.handleDocumentClick.bind(this));
  }

  handleExtensionMessage(event) {
    const message = event.data;

    switch (message.type) {
      case 'initAgentSelector':
        this.agents = message.payload.agents;
        this.activeAgent = message.payload.activeAgent;
        this.updateAgentIndicator();
        break;

      case 'agentActivated':
        this.activeAgent = message.payload.agent;
        this.updateAgentIndicator();
        break;

      case 'agentsResponse':
        this.renderAgentDropdown(message.payload.agents);
        break;
    }
  }

  handleInput(event) {
    const cursorPosition = this.inputElement.selectionStart;
    const textBeforeCursor = this.inputElement.value.substring(0, cursorPosition);

    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      const query = mentionMatch[1];
      this.showAgentDropdown(query);
    } else {
      this.hideDropdown();
    }
  }

  showAgentDropdown(query) {
    this.postMessage('getAgents', { query });
    this.positionDropdown();
  }

  renderAgentDropdown(agents) {
    if (agents.length === 0) {
      this.hideDropdown();
      return;
    }

    this.dropdownElement.innerHTML = agents.map((agent, index) => `
      <div class="agent-option" data-index="${index}" data-agent-id="${agent.id}">
        <div class="agent-avatar">${agent.avatar}</div>
        <div class="agent-info">
          <div class="agent-name">${agent.displayName}</div>
          <div class="agent-description">${agent.description}</div>
          <div class="agent-specialization">
            ${agent.specialization.slice(0, 3).map(spec =>
              `<span class="spec-tag">${spec}</span>`
            ).join('')}
          </div>
        </div>
        <div class="agent-shortcut">${agent.name}</div>
      </div>
    `).join('');

    // Event listeners pour les options
    this.dropdownElement.querySelectorAll('.agent-option').forEach((option, index) => {
      option.addEventListener('click', () => this.selectAgent(agents[index]));
      option.addEventListener('mouseenter', () => this.highlightOption(index));
    });

    this.dropdownElement.style.display = 'block';
    this.isDropdownVisible = true;
    this.selectedIndex = -1;
  }

  positionDropdown() {
    const inputRect = this.inputElement.getBoundingClientRect();
    this.dropdownElement.style.position = 'absolute';
    this.dropdownElement.style.top = `${inputRect.bottom + 5}px`;
    this.dropdownElement.style.left = `${inputRect.left}px`;
    this.dropdownElement.style.width = `${inputRect.width}px`;
  }

  selectAgent(agent) {
    // Remplacer la mention @ par le nom de l'agent
    const cursorPosition = this.inputElement.selectionStart;
    const textBeforeCursor = this.inputElement.value.substring(0, cursorPosition);
    const textAfterCursor = this.inputElement.value.substring(cursorPosition);

    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    if (mentionMatch) {
      const beforeMention = textBeforeCursor.substring(0, mentionMatch.index);
      this.inputElement.value = beforeMention + agent.name + ' ' + textAfterCursor;

      const newPosition = beforeMention.length + agent.name.length + 1;
      this.inputElement.setSelectionRange(newPosition, newPosition);
    }

    // Notifier l'extension
    this.postMessage('agentSelected', { agentId: agent.id });

    this.hideDropdown();
    this.inputElement.focus();
  }

  updateAgentIndicator() {
    const indicator = document.getElementById('agent-indicator');
    const avatar = document.getElementById('agent-avatar');
    const name = document.getElementById('agent-name');
    const specialization = document.getElementById('agent-specialization');

    if (this.activeAgent) {
      indicator.style.display = 'flex';
      avatar.textContent = this.activeAgent.avatar;
      name.textContent = this.activeAgent.displayName;
      specialization.textContent = this.activeAgent.specialization.join(', ');
    } else {
      indicator.style.display = 'none';
    }
  }

  postMessage(type, payload) {
    const vscode = acquireVsCodeApi();
    vscode.postMessage({ type, payload });
  }

  hideDropdown() {
    this.dropdownElement.style.display = 'none';
    this.isDropdownVisible = false;
    this.selectedIndex = -1;
  }

  // ... autres méthodes (handleKeyDown, etc.)
}

// Initialiser quand le DOM est prêt
document.addEventListener('DOMContentLoaded', () => {
  new WebviewAgentSelector();
});
```
