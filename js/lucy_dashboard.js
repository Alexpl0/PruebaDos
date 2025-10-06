// js/lucy_dashboard.js - Frontend completo para Lucy AI Dashboard

document.addEventListener('DOMContentLoaded', () => {
    // ==================== VARIABLES GLOBALES ====================
    let conversationHistory = [];
    let currentFileId = null;
    let currentFileName = null;
    let isProcessing = false;

    // ==================== REFERENCIAS DOM ====================
    const lucyForm = document.getElementById('lucy-form');
    const promptInput = document.getElementById('prompt-input');
    const generateBtn = document.getElementById('generate-dashboard-btn');
    const resultContainer = document.getElementById('dashboard-result-container');
    const loader = document.getElementById('loader');
    const iframeContainer = document.getElementById('iframe-container');
    const powerbiIframe = document.getElementById('powerbi-iframe');
    const chatContainer = document.getElementById('chat-container');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const sendChatBtn = document.getElementById('send-chat-btn');
    const downloadBtn = document.getElementById('download-excel-btn');
    const newDashboardBtn = document.getElementById('new-dashboard-btn');

    // Validar elementos
    if (!lucyForm) {
        console.error("El formulario de Lucy no se encontró en la página.");
        return;
    }

    // ==================== EVENT LISTENERS ====================
    
    lucyForm.addEventListener('submit', handleInitialRequest);
    
    if (sendChatBtn) {
        sendChatBtn.addEventListener('click', handleChatMessage);
    }
    
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleChatMessage();
            }
        });
    }
    
    if (downloadBtn) {
        downloadBtn.addEventListener('click', handleDownload);
    }
    
    if (newDashboardBtn) {
        newDashboardBtn.addEventListener('click', resetDashboard);
    }

    // ==================== FUNCIONES PRINCIPALES ====================

    /**
     * Maneja la solicitud inicial para crear el dashboard
     */
    async function handleInitialRequest(event) {
        event.preventDefault();

        const userPrompt = promptInput.value.trim();

        if (userPrompt === "") {
            Swal.fire({
                icon: 'warning',
                title: 'Instrucción vacía',
                text: 'Por favor, describe el dashboard que necesitas.',
                confirmButtonColor: '#4472C4'
            });
            return;
        }

        if (isProcessing) {
            return;
        }

        isProcessing = true;
        showLoadingState();
        
        try {
            // Agregar mensaje del usuario al historial
            addMessageToHistory('user', userPrompt);
            
            // Llamar a Gemini para procesar la solicitud
            const geminiResponse = await callGeminiProcessor(userPrompt);
            
            // Agregar respuesta de Gemini al historial
            addMessageToHistory('assistant', geminiResponse.geminiResponse);
            
            // Crear o actualizar Excel
            const excelResult = await callExcelAPI(
                geminiResponse.action,
                geminiResponse.excelData,
                geminiResponse.fileId || currentFileId
            );
            
            // Guardar información del archivo
            currentFileId = excelResult.fileId;
            currentFileName = excelResult.fileName;
            
            // Mostrar Excel en iframe
            showDashboardResult(excelResult.embedUrl);
            
            // Mostrar interfaz de chat
            showChatInterface();
            
            // Mostrar mensaje de éxito
            if (chatMessages) {
                addChatMessage('assistant', geminiResponse.geminiResponse);
            }
            
        } catch (error) {
            console.error("Error al generar dashboard:", error);
            showError(error.message);
        } finally {
            isProcessing = false;
        }
    }

    /**
     * Maneja mensajes del chat una vez creado el dashboard
     */
    async function handleChatMessage() {
        const message = chatInput.value.trim();
        
        if (message === "" || isProcessing) {
            return;
        }
        
        isProcessing = true;
        
        // Mostrar mensaje del usuario
        addChatMessage('user', message);
        chatInput.value = '';
        
        // Mostrar indicador de escritura
        showTypingIndicator();
        
        try {
            // Agregar al historial
            addMessageToHistory('user', message);
            
            // Llamar a Gemini
            const geminiResponse = await callGeminiProcessor(message);
            
            // Agregar respuesta al historial
            addMessageToHistory('assistant', geminiResponse.geminiResponse);
            
            // Si hay cambios en Excel, aplicarlos
            if (geminiResponse.excelData && Object.keys(geminiResponse.excelData).length > 0) {
                const excelResult = await callExcelAPI(
                    geminiResponse.action || 'update',
                    geminiResponse.excelData,
                    currentFileId
                );
                
                // Actualizar iframe
                powerbiIframe.src = excelResult.embedUrl;
                
                // Mostrar notificación
                showToast('Excel actualizado correctamente', 'success');
            }
            
            // Mostrar respuesta de Lucy
            removeTypingIndicator();
            addChatMessage('assistant', geminiResponse.geminiResponse);
            
        } catch (error) {
            console.error("Error en chat:", error);
            removeTypingIndicator();
            addChatMessage('assistant', 'Lo siento, ocurrió un error al procesar tu mensaje. Por favor, intenta de nuevo.');
            showToast('Error al procesar mensaje', 'error');
        } finally {
            isProcessing = false;
        }
    }

    /**
     * Maneja la descarga del archivo Excel
     */
    async function handleDownload() {
        if (!currentFileId) {
            showToast('No hay archivo para descargar', 'warning');
            return;
        }
        
        try {
            showToast('Preparando descarga...', 'info');
            
            const response = await fetch(`${window.PF_CONFIG.app.baseURL}dao/lucyAI/excel_api.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'download',
                    fileId: currentFileId
                })
            });
            
            const result = await response.json();
            
            if (result.status === 'success' && result.data.downloadUrl) {
                // Crear elemento de descarga temporal
                const a = document.createElement('a');
                a.href = result.data.downloadUrl;
                a.download = currentFileName || 'Lucy_Dashboard.xlsx';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                
                showToast('Descarga iniciada', 'success');
            } else {
                throw new Error(result.message || 'Error al obtener URL de descarga');
            }
            
        } catch (error) {
            console.error("Error al descargar:", error);
            showToast('Error al descargar el archivo', 'error');
        }
    }

    /**
     * Reinicia el dashboard para crear uno nuevo
     */
    function resetDashboard() {
        Swal.fire({
            title: '¿Crear nuevo dashboard?',
            text: 'Esto reiniciará la conversación y creará un nuevo archivo Excel.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#4472C4',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, crear nuevo',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                // Limpiar estado
                conversationHistory = [];
                currentFileId = null;
                currentFileName = null;
                
                // Limpiar UI
                promptInput.value = '';
                resultContainer.style.display = 'none';
                powerbiIframe.src = '';
                
                if (chatContainer) {
                    chatContainer.style.display = 'none';
                    chatMessages.innerHTML = '';
                }
                
                // Scroll al inicio
                window.scrollTo({ top: 0, behavior: 'smooth' });
                
                showToast('¡Listo para crear un nuevo dashboard!', 'success');
            }
        });
    }

    // ==================== FUNCIONES DE API ====================

    /**
     * Llama al procesador de Gemini
     */
    async function callGeminiProcessor(message) {
        const response = await fetch(`${window.PF_CONFIG.app.baseURL}dao/lucyAI/gemini_processor.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                history: conversationHistory,
                fileId: currentFileId
            })
        });

        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.status === 'success') {
            return data;
        } else {
            throw new Error(data.message || 'Error desconocido del servidor');
        }
    }

    /**
     * Llama a la API de Excel
     */
    async function callExcelAPI(action, excelData, fileId = null) {
        const payload = {
            action: action,
            fileId: fileId,
            fileName: currentFileName || `Lucy_Dashboard_${new Date().toISOString().split('T')[0]}`,
            worksheets: excelData.worksheets || [],
            cellUpdates: excelData.cellUpdates || []
        };

        const response = await fetch(`${window.PF_CONFIG.app.baseURL}dao/lucyAI/excel_api.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Error del servidor Excel API: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.status === 'success') {
            return data.data;
        } else {
            throw new Error(data.message || 'Error en Excel API');
        }
    }

    // ==================== FUNCIONES DE UI ====================

    /**
     * Muestra el estado de carga
     */
    function showLoadingState() {
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Procesando...';
        resultContainer.style.display = 'block';
        loader.style.display = 'block';
        iframeContainer.style.display = 'none';
        powerbiIframe.src = '';
        resultContainer.scrollIntoView({ behavior: 'smooth' });
    }

    /**
     * Muestra el resultado del dashboard
     */
    function showDashboardResult(embedUrl) {
        loader.style.display = 'none';
        powerbiIframe.src = embedUrl;
        iframeContainer.style.display = 'block';
        
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i class="fas fa-cogs me-2"></i>Generar Dashboard';
    }

    /**
     * Muestra la interfaz de chat
     */
    function showChatInterface() {
        if (chatContainer) {
            chatContainer.style.display = 'block';
            setTimeout(() => {
                chatContainer.scrollIntoView({ behavior: 'smooth' });
            }, 500);
        }
    }

    /**
     * Agrega un mensaje al chat visual
     */
    function addChatMessage(role, content) {
        if (!chatMessages) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${role}-message`;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        
        if (role === 'assistant') {
            avatar.innerHTML = '<img src="assets/assistant/Lucy.png" alt="Lucy" width="32" height="32">';
        } else {
            avatar.innerHTML = '<i class="fas fa-user"></i>';
        }
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.textContent = content;
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);
        chatMessages.appendChild(messageDiv);
        
        // Scroll al último mensaje
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    /**
     * Muestra indicador de escritura
     */
    function showTypingIndicator() {
        if (!chatMessages) return;
        
        const typingDiv = document.createElement('div');
        typingDiv.className = 'chat-message assistant-message typing-indicator';
        typingDiv.id = 'typing-indicator';
        
        typingDiv.innerHTML = `
            <div class="message-avatar">
                <img src="assets/assistant/Lucy.png" alt="Lucy" width="32" height="32">
            </div>
            <div class="message-content">
                <div class="typing-dots">
                    <span></span><span></span><span></span>
                </div>
            </div>
        `;
        
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    /**
     * Elimina indicador de escritura
     */
    function removeTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    /**
     * Agrega mensaje al historial de conversación
     */
    function addMessageToHistory(role, content) {
        conversationHistory.push({
            role: role,
            content: content
        });
    }

    /**
     * Muestra un toast notification
     */
    function showToast(message, type = 'info') {
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            didOpen: (toast) => {
                toast.addEventListener('mouseenter', Swal.stopTimer);
                toast.addEventListener('mouseleave', Swal.resumeTimer);
            }
        });

        Toast.fire({
            icon: type,
            title: message
        });
    }

    /**
     * Muestra un error con SweetAlert
     */
    function showError(message) {
        loader.style.display = 'none';
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i class="fas fa-cogs me-2"></i>Generar Dashboard';
        
        Swal.fire({
            icon: 'error',
            title: 'Oops... algo salió mal',
            text: `No se pudo generar el dashboard. Error: ${message}`,
            confirmButtonColor: '#dc3545'
        });
    }

    // ==================== INICIALIZACIÓN ====================
    
    console.log('Lucy Dashboard inicializado correctamente');
});