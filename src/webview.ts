export function getWebviewContent() {
  return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Code Assistant AI</title>
    <style>
      .toolbar {
        display: flex;
        background-color: #2d2d2d;
        padding: 8px;
        border-radius: 4px;
        margin-bottom: 10px;
      }
      
      .toolbar-button {
        background: transparent;
        border: none;
        color: #cccccc;
        margin-right: 8px;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 3px;
      }
      
      .toolbar-button:hover {
        background-color: #3d3d3d;
      }
      
      .toolbar-dropdown {
        margin-right: auto;
      }
      
      .settings-button, .send-button {
        display: flex;
        align-items: center;
      }
    </style>
  </head>
  <body>
    <div id="chat-container">
      <div class="toolbar">
        <div class="toolbar-dropdown">
          <button class="toolbar-button">Agent ▾</button>
        </div>
        <button class="toolbar-button" id="attach-button">📎</button>
        <button class="toolbar-button" id="mention-button">@</button>
        <button class="toolbar-button settings-button">⚙️</button>
        <button class="toolbar-button send-button">➤</button>
      </div>
      <div id="messages"></div>
      <div id="input-area">
        <textarea id="user-input" placeholder="Ask or instruct Augment Agent"></textarea>
      </div>
    </div>
    
    <script>
      const vscode = acquireVsCodeApi();
      const userInput = document.getElementById('user-input');
      const messages = document.getElementById('messages');
      
      // Attach button functionality
      document.getElementById('attach-button').addEventListener('click', () => {
        // Show file picker to attach files
        vscode.postMessage({
          command: 'attachFile'
        });
      });
      
      // Mention button functionality
      document.getElementById('mention-button').addEventListener('click', () => {
        // Show file picker for @ mentions
        vscode.postMessage({
          command: 'mentionFile'
        });
      });
      
      // Settings button functionality
      document.querySelector('.settings-button').addEventListener('click', () => {
        vscode.postMessage({
          command: 'openSettings'
        });
      });
      
      // Send button functionality
      document.querySelector('.send-button').addEventListener('click', () => {
        const text = userInput.value;
        if (text.trim()) {
          sendMessage(text);
        }
      });
      
      function sendMessage(text) {
        // Add user message to UI
        addMessage('user', text);
        
        // Send to extension
        vscode.postMessage({
          command: 'query',
          text: text
        });
        
        userInput.value = '';
      }
      
      // Handle messages from the extension
      window.addEventListener('message', event => {
        const message = event.data;
        if (message.type === 'response') {
          addMessage('assistant', message.content);
        }
      });
      
      function addMessage(sender, text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = sender === 'user' ? 'user-message' : 'assistant-message';
        messageDiv.textContent = text;
        messages.appendChild(messageDiv);
      }
    </script>
  </body>
  </html>`;
}
