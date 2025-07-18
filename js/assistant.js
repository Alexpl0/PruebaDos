/**
 * Virtual Assistant - Lucy
 * Integrated chat system for all Premium Freight system pages.
 * Version modified to include user context, report downloads, and a simplified wake-up call.
 */
class VirtualAssistant {
    constructor() {
        this.isOpen = false;
        this.apiEndpoint = 'https://phytonclaude.onrender.com/ask';
        this.conversationHistory = [];
        this.userContext = {}; // Se inicializa vacío y se carga después
        this.init();
    }

    async init() {
        // Primero carga el contexto del usuario de forma asíncrona
        await this.loadUserContext();
        // Luego, crea el HTML (que ahora puede usar el nombre del usuario)
        this.createAssistantHTML();
        // Configura los event listeners
        this.setupEventListeners();
        // Muestra el mensaje de bienvenida
        this.showWelcomeMessage();
        // Finalmente, envía la llamada para "despertar" al backend
        this.sendWakeUpCall();
    }

    /**
     * Carga de forma asíncrona el contexto del usuario desde el objeto global PF_CONFIG.
     * Esto asegura que el script no falle si se carga antes que la configuración.
     */
    async loadUserContext() {
        return new Promise(resolve => {
            const interval = setInterval(() => {
                if (window.PF_CONFIG?.user) {
                    clearInterval(interval);
                    this.userContext = {
                        name: window.PF_CONFIG.user.name || 'Guest',
                        plant: window.PF_CONFIG.user.plant || null,
                        id: window.PF_CONFIG.user.id || null,
                        level: window.PF_CONFIG.user.authorizationLevel || 0
                    };
                    console.log('Assistant context loaded for user:', this.userContext);
                    resolve();
                }
            }, 100);
        });
    }

    createAssistantHTML() {
        const lucyAvatarSrc = 'assets/assistant/Lucy.png';
        const userName = this.userContext.name || 'Guest';

        const assistantHTML = `
            <!-- Floating Virtual Assistant -->
            <div id="virtual-assistant" class="virtual-assistant">
                <!-- Assistant Button (Lucy) -->
                <div id="assistant-button" class="assistant-button" title="Hi! I'm Lucy, your virtual assistant. Click to chat with me!">
                    <img src="${lucyAvatarSrc}" alt="Lucy - Virtual Assistant" class="assistant-avatar">
                    <div class="assistant-pulse"></div>
                    <div class="assistant-welcome-bubble" id="welcome-bubble">
                        <p>Hi, ${userName}! I'm Lucy 👋<br>I'm here to help!</p>
                        <div class="bubble-arrow"></div>
                    </div>
                </div>

                <!-- Chat Window -->
                <div id="chat-window" class="chat-window">
                    <!-- Chat Header -->
                    <div class="chat-header">
                        <div class="chat-header-info">
                            <img src="${lucyAvatarSrc}" alt="Lucy" class="chat-avatar">
                            <div class="chat-title">
                                <h4>Lucy</h4>
                                <span class="chat-status">Virtual Assistant • Online</span>
                            </div>
                        </div>
                        <div class="chat-controls">
                            <button id="close-chat" class="chat-control-btn" title="Close">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Messages Area -->
                    <div class="chat-messages" id="chat-messages">
                        <div class="message assistant-message">
                             <div class="message-avatar">
                                <img src="${lucyAvatarSrc}" alt="Lucy">
                            </div>
                            <div class="message-content">
                                <div class="message-bubble" id="initial-assistant-message">
                                    Hello, ${userName}! I'm Lucy, your virtual assistant for Premium Freight. How can I assist you today?
                                </div>
                                 <div class="message-time">${this.getCurrentTime()}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Typing Indicator -->
                    <div class="typing-indicator" id="typing-indicator">
                        <div class="message assistant-message">
                            <div class="message-avatar">
                                <img src="${lucyAvatarSrc}" alt="Lucy">
                            </div>
                            <div class="message-content">
                                <div class="typing-dots">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Message Input -->
                    <div class="chat-input">
                        <div class="input-container">
                            <input type="text" id="message-input" placeholder="Type your question here..." maxlength="500">
                            <button id="send-message" class="send-button" title="Send message">
                                <i class="fas fa-paper-plane"></i>
                            </button>
                        </div>
                        <div class="input-footer">
                            <small>Ask me anything about Premium Freight!</small>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', assistantHTML);
    }
    
    /**
     * Envía una llamada inicial simple para "despertar" el servidor de Render.
     */
    async sendWakeUpCall() {
        // No mostrar el indicador de escritura para esta llamada de fondo
        console.log('Sending wake-up call to backend...');
        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: "Initialize session",
                    user_context: this.userContext
                })
            });
            if (!response.ok) throw new Error(`Wake-up call failed: ${response.status}`);
            const data = await response.json();
            console.log('Backend wake-up response:', data.answer);
        } catch (error) {
            console.error('Error during wake-up call:', error);
        }
    }

    setupEventListeners() {
        const assistantButton = document.getElementById('assistant-button');
        const closeChat = document.getElementById('close-chat');
        const sendMessage = document.getElementById('send-message');
        const messageInput = document.getElementById('message-input');

        assistantButton.addEventListener('click', () => this.toggleChat());
        closeChat.addEventListener('click', () => this.closeChat());
        sendMessage.addEventListener('click', () => this.sendMessage());

        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        setTimeout(() => this.hideWelcomeMessage(), 5000);
    }

    toggleChat() {
        if (this.isOpen) {
            this.closeChat();
        } else {
            this.openChat();
        }
    }

    openChat() {
        const chatWindow = document.getElementById('chat-window');
        const assistantButton = document.getElementById('assistant-button');
        
        chatWindow.style.display = 'flex';
        assistantButton.classList.add('chat-open');
        this.isOpen = true;
        
        setTimeout(() => document.getElementById('message-input').focus(), 300);
        this.hideWelcomeMessage();
    }

    closeChat() {
        const chatWindow = document.getElementById('chat-window');
        const assistantButton = document.getElementById('assistant-button');
        
        chatWindow.style.display = 'none';
        assistantButton.classList.remove('chat-open');
        this.isOpen = false;
    }

    showWelcomeMessage() {
        const welcomeBubble = document.getElementById('welcome-bubble');
        setTimeout(() => welcomeBubble.classList.add('show'), 1000);
    }

    hideWelcomeMessage() {
        const welcomeBubble = document.getElementById('welcome-bubble');
        welcomeBubble.classList.remove('show');
    }

    async sendMessage() {
        const messageInput = document.getElementById('message-input');
        const message = messageInput.value.trim();

        if (!message) return;

        this.addUserMessage(message);
        messageInput.value = '';
        this.showTypingIndicator();

        try {
            const requestBody = {
                question: message,
                user_context: this.userContext // Siempre se envía el contexto del usuario
            };
            
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

             if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            this.hideTypingIndicator();
            // Se pasa el objeto de datos completo para que pueda detectar la URL del reporte
            this.addAssistantMessage(data);

        } catch (error) {
            console.error('Error sending message to the assistant:', error);
            this.hideTypingIndicator();
            this.addAssistantMessage({ answer: 'Sorry, I\'m having trouble connecting. Please try again in a moment.' });
        }
    }

    addUserMessage(message) {
        const chatMessages = document.getElementById('chat-messages');
        const messageTime = this.getCurrentTime();
        
        const messageHTML = `
            <div class="message user-message">
                <div class="message-content">
                    <div class="message-bubble">
                        ${this.escapeHtml(message)}
                    </div>
                    <div class="message-time">${messageTime}</div>
                </div>
            </div>
        `;
        
        chatMessages.insertAdjacentHTML('beforeend', messageHTML);
        this.scrollToBottom();
    }

    addAssistantMessage(data) {
        const chatMessages = document.getElementById('chat-messages');
        const messageTime = this.getCurrentTime();
        const lucyAvatarSrc = 'assets/assistant/Lucy.png';
        
        // Extrae el texto y la URL del reporte del objeto de datos
        const messageText = data.answer || 'I could not process your request.';
        const reportUrl = data.report_url;

        let messageBubbleContent = this.formatAssistantMessage(messageText);

        // --- LÓGICA NUEVA: AÑADIR BOTÓN DE DESCARGA ---
        if (reportUrl) {
            messageBubbleContent += `<br><br><a href="${reportUrl}" class="download-button" target="_blank" download="Lucy_Report.xlsx">
                <i class="fas fa-file-excel"></i> Download Report
            </a>`;
        }
        
        const messageHTML = `
            <div class="message assistant-message">
                <div class="message-avatar">
                    <img src="${lucyAvatarSrc}" alt="Lucy">
                </div>
                <div class="message-content">
                    <div class="message-bubble">
                        ${messageBubbleContent}
                    </div>
                    <div class="message-time">${messageTime}</div>
                </div>
            </div>
        `;
        
        chatMessages.insertAdjacentHTML('beforeend', messageHTML);
        this.scrollToBottom();
    }

    showTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        typingIndicator.style.display = 'flex';
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        typingIndicator.style.display = 'none';
    }

    scrollToBottom() {
        const chatMessages = document.getElementById('chat-messages');
        setTimeout(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 100);
    }

    getCurrentTime() {
        return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatAssistantMessage(message) {
        let formattedMessage = this.escapeHtml(message);
        formattedMessage = formattedMessage.replace(/\n/g, '<br>');
        
        formattedMessage = formattedMessage.replace(/(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(euros?|EUR|€|\$|dollars?)/gi, 
            '<strong class="currency-highlight">$1 $2</strong>');
        
        return formattedMessage;
    }
}

// Initialize the assistant when the DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    const excludePages = ['login.php', 'register.php', 'index.html'];
    const currentPage = window.location.pathname.split('/').pop();
    
    // Asume que tienes un objeto global PF_CONFIG definido en tu PHP
    if (!excludePages.includes(currentPage) && window.PF_CONFIG && window.PF_CONFIG.user.authorizationLevel > 0) {
        window.virtualAssistant = new VirtualAssistant();
    }
});
