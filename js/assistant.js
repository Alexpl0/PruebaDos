/**
 * Virtual Assistant - Lucy
 * Integrated chat system for all Premium Freight system pages.
 * Version modified to remove minimize functionality and add context initialization.
 */
class VirtualAssistant {
    constructor() {
        this.isOpen = false;
        // The real API can be changed here if needed
        this.apiEndpoint = 'https://phytonclaude.onrender.com/ask';
        this.conversationHistory = [];
        this.init();
    }

    init() {
        this.createAssistantHTML();
        this.setupEventListeners();
        this.showWelcomeMessage();
        // New function to "wake up" the server and personalize the greeting.
        this.initializeAssistantContext();
    }

    createAssistantHTML() {
        // Use the correct path for the images.
        const lucyAvatarSrc = 'assets/assistant/Lucy.png';

        const assistantHTML = `
            <!-- Floating Virtual Assistant -->
            <div id="virtual-assistant" class="virtual-assistant">
                <!-- Assistant Button (Lucy) -->
                <div id="assistant-button" class="assistant-button" title="Hi! I'm Lucy, your virtual assistant. Click to chat with me!">
                    <img src="${lucyAvatarSrc}" alt="Lucy - Virtual Assistant" class="assistant-avatar">
                    <div class="assistant-pulse"></div>
                    <div class="assistant-welcome-bubble" id="welcome-bubble">
                        <p>Hi! I'm Lucy 👋<br>I'm here to help!</p>
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
                                    Connecting to Lucy...
                                </div>
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
     * Sends an initial background message to "wake up" the server
     * and set the user context (name and plant).
     */
    async initializeAssistantContext() {
        const initialMessageBubble = document.getElementById('initial-assistant-message');
        const firstMessageContainer = initialMessageBubble.closest('.message-content');

        try {
            // Wait for the configuration object to be available.
            await new Promise(resolve => {
                const interval = setInterval(() => {
                    if (window.PF_CONFIG?.user) {
                        clearInterval(interval);
                        resolve();
                    }
                }, 100);
            });

            const userName = window.PF_CONFIG.user.name || 'Guest';
            const userPlant = window.PF_CONFIG.user.plant || 'unknown';
            
            // Do not send if it's a guest, to avoid wasting resources.
            if (userName === 'Guest') {
                 if(initialMessageBubble) {
                    initialMessageBubble.innerHTML = 'Hi! I\'m Lucy, your virtual assistant. How can I help you today?';
                    const timeHTML = `<div class="message-time">${this.getCurrentTime()}</div>`;
                    firstMessageContainer.insertAdjacentHTML('beforeend', timeHTML);
                 }
                 return;
            }

            // ================== START: ENGLISH WAKE-UP CALL ==================
            // Context message to be sent to the AI, ensuring the first response is in English.
            const contextMessage = `Hello Lucy. My name is ${userName} and I work at the ${userPlant} plant. Please introduce yourself and greet me by my name. It is very important that your first response is in English. Do not tell me who created you.`;
            // =================== END: ENGLISH WAKE-UP CALL ===================

            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: contextMessage })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Update the first message bubble with the personalized response from the AI.
            if (initialMessageBubble && data.answer) {
                initialMessageBubble.innerHTML = this.formatAssistantMessage(data.answer);
            } else {
                 initialMessageBubble.innerHTML = `Hi ${userName}! I'm Lucy, your assistant. How can I help you?`;
            }

        } catch (error) {
            console.error('Error initializing assistant context:', error);
            if (initialMessageBubble) {
                initialMessageBubble.innerHTML = 'Hi! I\'m Lucy. There seems to be a connection issue, but I\'m ready to help. What do you need?';
            }
        } finally {
            // Add the time to the message, whether it's the personalized one or the error one.
            if(firstMessageContainer) {
                const timeHTML = `<div class="message-time">${this.getCurrentTime()}</div>`;
                firstMessageContainer.insertAdjacentHTML('beforeend', timeHTML);
            }
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
            this.addAssistantMessage(data.answer || 'Sorry, I couldn\'t process your request at this moment.');

        } catch (error) {
            console.error('Error sending message to the assistant:', error);
            this.hideTypingIndicator();
            this.addAssistantMessage('Sorry, I\'m having trouble connecting. Please try again in a moment.');
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
        const lucyAvatarSrc = 'assets/assistant/Lucy.png';
        
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
        
        formattedMessage = formattedMessage.replace(/(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(euros?|EUR|€|\$|dollars?)/gi, 
            '<strong class="currency-highlight">$1 $2</strong>');
        
        return formattedMessage;
    }
}

// Initialize the assistant when the DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    const excludePages = ['login.php', 'register.php', 'index.html'];
    const currentPage = window.location.pathname.split('/').pop();
    
    // For this demo, we always initialize the assistant.
    // if (!excludePages.includes(currentPage)) {
        window.virtualAssistant = new VirtualAssistant();
    // }
});
