// Project: Bear Helper Animation Manager

window.MiImpresoraWeb = window.MiImpresoraWeb || {};

window.MiImpresoraWeb.BearAnimation = class BearAnimation {
    constructor() {
        this.logger = new window.MiImpresoraWeb.Logger();
        this.currentFrame = 0;
        this.isAnimating = false;
        this.animationSpeed = 800; // milliseconds between frames
        this.messageTimeout = null;
        
        // Frame data - using base64 encoded images or placeholder for your actual images
        this.frames = [
            {
            img: 'images/Capibara3.png',
            message: '¡Listo para ayudar! 💖'
            },
            {
            img: 'images/Capibara2.png',
            message: '¡Gran idea! ✨'
            },
            {
            img: 'images/Capibara1.png',
            message: 'Procesando datos... 🔄'
            }
        ];
        
        this.messages = {
            welcome: '¡Hola! Soy tu asistente 💕',
            fileLoading: 'Cargando archivo... 📁',
            processing: 'Procesando datos... ⚙️',
            ready: '¡Todo listo! 🎉',
            printing: 'Preparando impresión... 🖨️',
            success: '¡Perfecto! ✨',
            error: 'Ups, algo salió mal 😅',
            thinking: 'Déjame pensar... 🤔',
            excited: '¡Genial! Me encanta ayudar 💖'
        };
        
        this.init();
    }
    
    init() {
        this.logger.info('Initializing Bear Animation', 'bearAnimation');
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupBear());
        } else {
            this.setupBear();
        }
    }
    
    setupBear() {
        let bearHelper = document.getElementById('bearHelper');
        if (!bearHelper) {
            bearHelper = document.createElement('div');
            bearHelper.id = 'bearHelper';
            document.body.appendChild(bearHelper);
        }
        this.bearHelper = bearHelper; // <--- ¡Agrega esta línea!
        bearHelper.innerHTML = `
            <div class="bear-message" style="display:none"></div>
            <div class="bear-frame"></div>
        `;
        this.bearFrame = bearHelper.querySelector('.bear-frame');
        this.bearMessage = bearHelper.querySelector('.bear-message');
        this.updateFrame(this.currentFrame);

        // Set initial frame
        this.updateFrame(0);

        // Setup click handler
        this.bearHelper.addEventListener('click', () => this.onBearClick());

        // Start animation cycle
        this.startAnimation();

        // Show welcome message
        setTimeout(() => {
            this.showMessage('welcome');
        }, 1000);

        this.logger.success('Bear animation initialized', 'bearAnimation');
    }
    
    updateFrame(frameIndex) {
        if (!this.frames[frameIndex] || !this.bearFrame) return;
        const frame = this.frames[frameIndex];
        this.bearFrame.innerHTML = `
            <img src="${frame.img}" alt="Capibara" class="bear-img" style="width:120px;height:auto;object-fit:contain;">
        `;
        this.currentFrame = frameIndex;
        this.logger.info(`Updated to frame ${frameIndex}`, 'bearAnimation');
    }
    
    startAnimation() {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        this.animationInterval = setInterval(() => {
            this.nextFrame();
        }, this.animationSpeed);
        
        this.logger.info('Animation started', 'bearAnimation');
    }
    
    stopAnimation() {
        if (!this.isAnimating) return;
        
        this.isAnimating = false;
        if (this.animationInterval) {
            clearInterval(this.animationInterval);
            this.animationInterval = null;
        }
        
        this.logger.info('Animation stopped', 'bearAnimation');
    }
    
    nextFrame() {
        const nextIndex = (this.currentFrame + 1) % this.frames.length;
        this.updateFrame(nextIndex);
    }
    
    showMessage(messageKey, customMessage = null, duration = 3000) {
        if (!this.bearMessage) return;
        
        const message = customMessage || this.messages[messageKey] || messageKey;
        
        // Clear existing timeout
        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
        }
        
        // Update message
        this.bearMessage.textContent = message;
        this.bearHelper.classList.add('show-message');
        
        // Hide message after duration
        this.messageTimeout = setTimeout(() => {
            this.bearHelper.classList.remove('show-message');
        }, duration);
        
        this.logger.info(`Showing message: ${message}`, 'bearAnimation');
    }
    
    onBearClick() {
        const randomMessages = [
            '¡Eres la mejor! 🌟',
            '¡Estás haciendo un gran trabajo! 💪',
            '¡Sigue así, lo estás logrando! 🚀',
            '¡Tu esfuerzo vale oro! 🏅',
            '¡No te rindas, vas genial! 💖',
            '¡Cada día mejoras más! ✨',
            '¡Confío en ti, puedes con todo! 🦸‍♀️'
        ];
        
        const randomMessage = randomMessages[Math.floor(Math.random() * randomMessages.length)];
        this.showMessage(null, randomMessage, 2500);
        
        // Quick frame change on click
        this.nextFrame();
        
        this.logger.info('Bear clicked', 'bearAnimation');
    }
    
    // Public methods for integration with main app
    setProcessingState() {
        this.showMessage('processing');
        this.updateFrame(2); // Thinking frame
    }
    
    setLoadingState() {
        this.showMessage('fileLoading');
        this.updateFrame(1); // Smart frame
    }
    
    setReadyState() {
        this.showMessage('ready');
        this.updateFrame(0); // Happy frame
    }
    
    setPrintingState() {
        this.showMessage('printing');
        this.updateFrame(1); // Smart frame
    }
    
    setSuccessState() {
        this.showMessage('success');
        this.updateFrame(0); // Happy frame
    }
    
    setErrorState() {
        this.showMessage('error');
        this.updateFrame(2); // Thinking frame
    }
    
    setExcitedState() {
        this.showMessage('excited');
        this.updateFrame(0); // Happy frame
        
        // Add extra animation
        this.bearHelper.style.animation = 'bearFloat 0.5s ease-in-out 3';
        setTimeout(() => {
            this.bearHelper.style.animation = '';
        }, 1500);
    }
    
    // Integration with app states
    onFileSelected() {
        this.setLoadingState();
    }
    
    onFileProcessing() {
        this.setProcessingState();
    }
    
    onSheetsLoaded() {
        this.setReadyState();
    }
    
    onPrintStarted() {
        this.setPrintingState();
    }
    
    onPrintCompleted() {
        this.setSuccessState();
    }
    
    onError() {
        this.setErrorState();
    }
    
    onReset() {
        this.setReadyState();
        this.showMessage('welcome');
    }
    
    destroy() {
        this.stopAnimation();
        
        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
        }
        
        if (this.bearHelper) {
            this.bearHelper.remove();
        }
        
        this.logger.info('Bear animation destroyed', 'bearAnimation');
    }
};

// Initialize bear animation when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    window.bearAnimation = new window.MiImpresoraWeb.BearAnimation();
});