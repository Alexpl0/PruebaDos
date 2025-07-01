/**
 * Virtual Assistant - Lucy
 * Sistema de chat integrado para todas las páginas del sistema Premium Freight
 */

class VirtualAssistant {
    constructor() {
        this.isOpen = false;
        this.isMinimized = false;
        this.apiEndpoint = 'https://phytonclaude.onrender.com/ask';
        this.conversationHistory = [];
        this.init();
    }

    init() {
        this.createAssistantHTML();
        this.setupEventListeners();
        this.showWelcomeMessage();
    }

    createAssistantHTML() {
        const assistantHTML = `
            <!-- Asistente Virtual Flotante -->
            <div id="virtual-assistant" class="virtual-assistant">
                <!-- Botón del asistente (Lucy) -->
                <div id="assistant-button" class="assistant-button" title="Hi! I'm Lucy, your virtual assistant. Click to chat with me!">
                    <img src="assets/assistant/Lucy.jpg" alt="Lucy - Virtual Assistant" class="assistant-avatar">
                    <div class="assistant-pulse"></div>
                    <div class="assistant-welcome-bubble" id="welcome-bubble">
                        <p>Hi! I'm Lucy 👋<br>I'm here to help you!</p>
                        <div class="bubble-arrow"></div>
                    </div>
                </div>

                <!-- Ventana de Chat -->
                <div id="chat-window" class="chat-window">
                    <!-- Header del Chat -->
                    <div class="chat-header">
                        <div class="chat-header-info">
                            <img src="assets/assistant/Lucy.jpg" alt="Lucy" class="chat-avatar">
                            <div class="chat-title">
                                <h4>Lucy</h4>
                                <span class="chat-status">Virtual Assistant • Online</span>
                            </div>
                        </div>
                        <div class="chat-controls">
                            <button id="minimize-chat" class="chat-control-btn" title="Minimize">
                                <i class="fas fa-minus"></i>
                            </button>
                            <button id="close-chat" class="chat-control-btn" title="Close">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Área de Mensajes -->
                    <div class="chat-messages" id="chat-messages">
                        <div class="message assistant-message">
                            <div class="message-avatar">
                                <img src="assets/assistant/Lucy.jpg" alt="Lucy">
                            </div>
                            <div class="message-content">
                                <div class="message-bubble">
                                    Hello! I'm Lucy, your virtual assistant for Premium Freight. I can help you with questions about orders, costs, processes, and more. How can I assist you today?
                                </div>
                                <div class="message-time">${this.getCurrentTime()}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Indicador de Escritura -->
                    <div class="typing-indicator" id="typing-indicator">
                        <div class="message assistant-message">
                            <div class="message-avatar">
                                <img src="assets/assistant/Lucy.jpg" alt="Lucy">
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

                    <!-- Input de Mensaje -->
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

        // Insertar al final del body
        document.body.insertAdjacentHTML('beforeend', assistantHTML);
    }

    setupEventListeners() {
        const assistantButton = document.getElementById('assistant-button');
        const closeChat = document.getElementById('close-chat');
        const minimizeChat = document.getElementById('minimize-chat');
        const sendMessage = document.getElementById('send-message');
        const messageInput = document.getElementById('message-input');

        // Abrir/cerrar chat al hacer clic en Lucy
        assistantButton.addEventListener('click', () => {
            this.toggleChat();
        });

        // Cerrar chat
        closeChat.addEventListener('click', () => {
            this.closeChat();
        });

        // Minimizar chat
        minimizeChat.addEventListener('click', () => {
            this.minimizeChat();
        });

        // Enviar mensaje
        sendMessage.addEventListener('click', () => {
            this.sendMessage();
        });

        // Enviar mensaje con Enter
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Ocultar burbuja de bienvenida después de un tiempo
        setTimeout(() => {
            this.hideWelcomeMessage();
        }, 5000);
    }

    toggleChat() {
        const chatWindow = document.getElementById('chat-window');
        const assistantButton = document.getElementById('assistant-button');
        
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
        this.isMinimized = false;
        
        // Focus en el input
        setTimeout(() => {
            document.getElementById('message-input').focus();
        }, 300);

        this.hideWelcomeMessage();
    }

    closeChat() {
        const chatWindow = document.getElementById('chat-window');
        const assistantButton = document.getElementById('assistant-button');
        
        chatWindow.style.display = 'none';
        assistantButton.classList.remove('chat-open');
        this.isOpen = false;
        this.isMinimized = false;
    }

    minimizeChat() {
        const chatWindow = document.getElementById('chat-window');
        
        if (this.isMinimized) {
            chatWindow.style.height = '400px';
            this.isMinimized = false;
        } else {
            chatWindow.style.height = '60px';
            this.isMinimized = true;
        }
    }

    showWelcomeMessage() {
        const welcomeBubble = document.getElementById('welcome-bubble');
        setTimeout(() => {
            welcomeBubble.classList.add('show');
        }, 1000);
    }

    hideWelcomeMessage() {
        const welcomeBubble = document.getElementById('welcome-bubble');
        welcomeBubble.classList.remove('show');
    }

    async sendMessage() {
        const messageInput = document.getElementById('message-input');
        const message = messageInput.value.trim();

        if (!message) return;

        // Añadir mensaje del usuario
        console.log('User message:', message);
        this.addUserMessage(message);
        messageInput.value = '';

        // Mostrar indicador de escritura
        this.showTypingIndicator();

        try {
            // Crear el JSON para enviar
            const requestBody = {
                question: message
            };
            console.log('Request JSON:', requestBody);

            // Enviar pregunta al endpoint
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            console.log('Response status:', response.status);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Response JSON:', data);

            // Ocultar indicador de escritura
            this.hideTypingIndicator();

            // Añadir respuesta del asistente
            this.addAssistantMessage(data.answer || 'I apologize, but I could not process your request at this moment.');

        } catch (error) {
            console.error('Error sending message to assistant:', error);
            this.hideTypingIndicator();
            this.addAssistantMessage('I apologize, but I\'m having trouble connecting to my knowledge base right now. Please try again in a moment.');
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

    addAssistantMessage(message) {
        const chatMessages = document.getElementById('chat-messages');
        const messageTime = this.getCurrentTime();
        
        const messageHTML = `
            <div class="message assistant-message">
                <div class="message-avatar">
                    <img src="assets/assistant/Lucy.jpg" alt="Lucy">
                </div>
                <div class="message-content">
                    <div class="message-bubble">
                        ${this.formatAssistantMessage(message)}
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
        typingIndicator.style.display = 'block';
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
        return new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatAssistantMessage(message) {
        // Convertir saltos de línea a <br>
        let formattedMessage = this.escapeHtml(message);
        formattedMessage = formattedMessage.replace(/\n/g, '<br>');
        
        // Formatear números con estilo
        formattedMessage = formattedMessage.replace(/(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(euros?|EUR|€)/gi, 
            '<strong class="currency-highlight">$1 $2</strong>');
        
        return formattedMessage;
    }
}

// Inicializar el asistente cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    // Solo inicializar si no estamos en páginas específicas que no lo necesiten
    const excludePages = ['login.php', 'register.php', 'index.html'];
    const currentPage = window.location.pathname.split('/').pop();
    
    if (!excludePages.includes(currentPage)) {
        window.virtualAssistant = new VirtualAssistant();
    }
});