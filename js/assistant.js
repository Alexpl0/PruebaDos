/**
 * Virtual Assistant - Lucy
 * Sistema de chat integrado para todas las páginas del sistema Premium Freight
 * Versión modificada para eliminar la funcionalidad de minimizar.
 */
class VirtualAssistant {
    constructor() {
        this.isOpen = false;
        // La API real se puede cambiar aquí si es necesario
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
        // Se usan placeholders para las imágenes ya que no se tiene acceso a la carpeta /assets.
        // En un entorno real, se usarían las rutas correctas como 'assets/assistant/Lucy.png'.
        const lucyAvatarSrc = 'assets/assistant/Lucy.png';

        const assistantHTML = `
            <!-- Asistente Virtual Flotante -->
            <div id="virtual-assistant" class="virtual-assistant">
                <!-- Botón del asistente (Lucy) -->
                <div id="assistant-button" class="assistant-button" title="¡Hola! Soy Lucy, tu asistente virtual. ¡Haz clic para chatear conmigo!">
                    <img src="${lucyAvatarSrc}" alt="Lucy - Asistente Virtual" class="assistant-avatar">
                    <div class="assistant-pulse"></div>
                    <div class="assistant-welcome-bubble" id="welcome-bubble">
                        <p>¡Hola! Soy Lucy 👋<br>¡Estoy aquí para ayudarte!</p>
                        <div class="bubble-arrow"></div>
                    </div>
                </div>

                <!-- Ventana de Chat -->
                <div id="chat-window" class="chat-window">
                    <!-- Header del Chat -->
                    <div class="chat-header">
                        <div class="chat-header-info">
                            <img src="${lucyAvatarSrc}" alt="Lucy" class="chat-avatar">
                            <div class="chat-title">
                                <h4>Lucy</h4>
                                <span class="chat-status">Asistente Virtual • En línea</span>
                            </div>
                        </div>
                        <div class="chat-controls">
                            <!-- Se eliminó el botón de minimizar -->
                            <button id="close-chat" class="chat-control-btn" title="Cerrar">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Área de Mensajes -->
                    <div class="chat-messages" id="chat-messages">
                        <div class="message assistant-message">
                             <div class="message-avatar">
                                <img src="${lucyAvatarSrc}" alt="Lucy">
                            </div>
                            <div class="message-content">
                                <div class="message-bubble">
                                    ¡Hola! Soy Lucy, tu asistente virtual de Premium Freight. Puedo ayudarte con preguntas sobre pedidos, costos, procesos y más. ¿Cómo puedo ayudarte hoy?
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Indicador de Escritura -->
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

                    <!-- Input de Mensaje -->
                    <div class="chat-input">
                        <div class="input-container">
                            <input type="text" id="message-input" placeholder="Escribe tu pregunta aquí..." maxlength="500">
                            <button id="send-message" class="send-button" title="Enviar mensaje">
                                <i class="fas fa-paper-plane"></i>
                            </button>
                        </div>
                        <div class="input-footer">
                            <small>¡Pregúntame lo que sea sobre Premium Freight!</small>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', assistantHTML);
        // Añadir el tiempo del primer mensaje después de crearlo
        const firstMessage = document.querySelector('.chat-messages .assistant-message');
        if (firstMessage) {
            const timeHTML = `<div class="message-time">${this.getCurrentTime()}</div>`;
            firstMessage.querySelector('.message-content').insertAdjacentHTML('beforeend', timeHTML);
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
            const requestBody = { question: message };
            // Simulación de la llamada a la API para la demo
            // En un entorno real, esta sería la llamada fetch.
            console.log('Enviando a la API:', requestBody);
            
            // Simular un retraso de la API
            await new Promise(resolve => setTimeout(resolve, 1500)); 
            
            // Simular una respuesta de la API
            const data = { answer: `Esta es una respuesta simulada para tu pregunta: "${message}". La integración real con la API está pendiente.` };
            
            console.log('Respuesta recibida:', data);
            
            this.hideTypingIndicator();
            this.addAssistantMessage(data.answer || 'Disculpa, no pude procesar tu solicitud en este momento.');

        } catch (error) {
            console.error('Error enviando mensaje al asistente:', error);
            this.hideTypingIndicator();
            this.addAssistantMessage('Disculpa, estoy teniendo problemas para conectarme. Por favor, inténtalo de nuevo en un momento.');
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
        const lucyAvatarSrc = 'https://placehold.co/100x100/4A90D9/FFFFFF?text=L';
        
        const messageHTML = `
            <div class="message assistant-message">
                <div class="message-avatar">
                    <img src="${lucyAvatarSrc}" alt="Lucy">
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
        
        formattedMessage = formattedMessage.replace(/(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(euros?|EUR|€)/gi, 
            '<strong class="currency-highlight">$1 $2</strong>');
        
        return formattedMessage;
    }
}

// Inicializar el asistente cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    const excludePages = ['login.php', 'register.php', 'index.html'];
    const currentPage = window.location.pathname.split('/').pop();
    
    // Para esta demo, siempre inicializamos el asistente.
    // if (!excludePages.includes(currentPage)) {
        window.virtualAssistant = new VirtualAssistant();
    // }
});
