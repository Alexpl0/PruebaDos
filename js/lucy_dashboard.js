// js/lucy_dashboard.js - Frontend completo para Lucy AI Dashboard (Excel y Power BI)

document.addEventListener('DOMContentLoaded', () => {
    // ==================== VARIABLES GLOBALES ====================
    let conversationHistory = [];
    let currentFileId = null;
    let currentFileName = 'Lucy_Dashboard';
    let isProcessing = false;
    let outputType = 'excel'; // 'excel' o 'powerbi'

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
    
    // Selector de tipo de output
    const excelBtn = document.getElementById('output-excel-btn');
    const powerbiBtn = document.getElementById('output-powerbi-btn');

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
    
    // Event listeners para selector de tipo
    if (excelBtn) {
        excelBtn.addEventListener('click', () => switchOutputType('excel'));
    }
    
    if (powerbiBtn) {
        powerbiBtn.addEventListener('click', () => switchOutputType('powerbi'));
    }

    // ==================== FUNCIONES DE SELECTOR ====================
    
    /**
     * Cambia el tipo de output y recarga la página
     */
    function switchOutputType(type) {
        if (type === outputType) {
            return; // Ya está seleccionado
        }
        
        // Si ya hay un dashboard creado, confirmar
        if (currentFileId) {
            Swal.fire({
                title: '¿Cambiar tipo de dashboard?',
                text: 'Esto recargará la página y perderás el dashboard actual.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#4472C4',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Sí, cambiar',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    location.reload();
                }
            });
        } else {
            // No hay dashboard, solo cambiar visualmente
            outputType = type;
            updateSelectorUI();
            
            // Actualizar placeholder y texto
            if (type === 'powerbi') {
                promptInput.placeholder = "Ej: 'Necesito un dashboard de Power BI con análisis de costos por transportista y tendencias mensuales...'";
                downloadBtn.style.display = 'none'; // Power BI no permite descarga directa
            } else {
                promptInput.placeholder = "Ej: 'Necesito un reporte con los costos totales por categoría de causa, una tabla con todas las órdenes pendientes...'";
                downloadBtn.style.display = 'inline-flex';
            }
            
            showToast(`Tipo cambiado a ${type === 'excel' ? 'Excel' : 'Power BI'}`, 'success');
        }
    }
    
    /**
     * Actualiza la UI del selector
     */
    function updateSelectorUI() {
        if (outputType === 'excel') {
            excelBtn.classList.add('active');
            powerbiBtn.classList.remove('active');
        } else {
            excelBtn.classList.remove('active');
            powerbiBtn.classList.add('active');
        }
    }
    
    // Inicializar UI del selector
    updateSelectorUI();

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
        
        const timeoutId = setTimeout(() => {
            if (isProcessing) {
                isProcessing = false;
                showError('La solicitud tomó demasiado tiempo (>60s). Por favor intenta de nuevo.');
            }
        }, 60000);
        
        try {
            console.log(`Iniciando creación de dashboard tipo: ${outputType}`);
            updateLoadingMessage('Procesando con IA...', 2);
            
            const geminiStartTime = Date.now();
            addMessageToHistory('user', userPrompt);
            
            const geminiResponse = await callGeminiProcessor(userPrompt);
            
            const geminiTime = ((Date.now() - geminiStartTime) / 1000).toFixed(2);
            console.log(`Gemini respondió en ${geminiTime}s`);
            
            if (geminiResponse.debug) {
                console.log('Debug info:', geminiResponse.debug);
            }
            
            addMessageToHistory('assistant', geminiResponse.geminiResponse);
            
            console.log(`Creando ${outputType === 'excel' ? 'Excel' : 'Power BI'}...`);
            updateLoadingMessage(outputType === 'excel' ? 'Creando Excel...' : 'Creando Power BI Dashboard...', 4);
            
            const apiStartTime = Date.now();
            const apiResult = await callDashboardAPI(
                geminiResponse.action,
                geminiResponse.excelData,
                geminiResponse.fileId || currentFileId
            );
            
            const apiTime = ((Date.now() - apiStartTime) / 1000).toFixed(2);
            console.log(`Dashboard creado en ${apiTime}s`);
            
            clearTimeout(timeoutId);
            
            currentFileId = outputType === 'excel' ? apiResult.fileId : apiResult.datasetId;
            currentFileName = outputType === 'excel' ? apiResult.fileName : apiResult.datasetName;
            
            console.log(`Archivo guardado: ${currentFileName} (ID: ${currentFileId})`);
            
            updateLoadingMessage('Cargando visualización...', 5);
            
            if (outputType === 'powerbi') {
                showPowerBIResult(apiResult);
            } else {
                showDashboardResult(apiResult.embedUrl);
            }
            
            showChatInterface();
            
            if (chatMessages) {
                addChatMessage('assistant', geminiResponse.geminiResponse);
            }
            
            const totalTime = ((Date.now() - geminiStartTime) / 1000).toFixed(2);
            console.log(`Proceso completo en ${totalTime}s total`);
            
            showToast(`Dashboard creado exitosamente en ${totalTime}s`, 'success');
            
        } catch (error) {
            clearTimeout(timeoutId);
            console.error("Error al generar dashboard:", error);
            showError(error.message);
        } finally {
            isProcessing = false;
        }
    }

    /**
     * Maneja mensajes del chat
     */
    async function handleChatMessage() {
        const message = chatInput.value.trim();
        
        if (message === "" || isProcessing) {
            return;
        }
        
        isProcessing = true;
        
        addChatMessage('user', message);
        chatInput.value = '';
        
        showTypingIndicator();
        
        try {
            addMessageToHistory('user', message);
            
            const geminiResponse = await callGeminiProcessor(message);
            
            addMessageToHistory('assistant', geminiResponse.geminiResponse);
            
            if (currentFileId && geminiResponse.excelData && Object.keys(geminiResponse.excelData).length > 0) {
                console.log('Actualizando dashboard existente:', currentFileId);
                
                const apiResult = await callDashboardAPI(
                    'update',
                    geminiResponse.excelData,
                    currentFileId
                );
                
                if (outputType === 'powerbi') {
                    showPowerBIResult(apiResult);
                } else {
                    showDashboardResult(apiResult.embedUrl);
                }
                
                showToast('Dashboard actualizado correctamente', 'success');
            } else if (!currentFileId) {
                console.log('No hay dashboard, creando nuevo');
                
                const apiResult = await callDashboardAPI(
                    'create',
                    geminiResponse.excelData,
                    null
                );
                
                currentFileId = outputType === 'excel' ? apiResult.fileId : apiResult.datasetId;
                currentFileName = outputType === 'excel' ? apiResult.fileName : apiResult.datasetName;
                
                if (outputType === 'powerbi') {
                    showPowerBIResult(apiResult);
                } else {
                    showDashboardResult(apiResult.embedUrl);
                }
            }
            
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
     * Maneja la descarga (solo Excel)
     */
    async function handleDownload() {
        if (!currentFileId || outputType !== 'excel') {
            showToast('No hay archivo Excel para descargar', 'warning');
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
     * Reinicia el dashboard
     */
    function resetDashboard() {
        Swal.fire({
            title: '¿Crear nuevo dashboard?',
            text: 'Esto reiniciará la conversación y creará un nuevo archivo.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#4472C4',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, crear nuevo',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                conversationHistory = [];
                currentFileId = null;
                currentFileName = null;
                
                promptInput.value = '';
                resultContainer.style.display = 'none';
                powerbiIframe.src = '';
                
                if (chatContainer) {
                    chatContainer.style.display = 'none';
                    chatMessages.innerHTML = '';
                }
                
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
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);
        
        try {
            const response = await fetch(`${window.PF_CONFIG.app.baseURL}dao/lucyAI/gemini_processor.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    history: conversationHistory,
                    fileId: currentFileId,
                    outputType: outputType
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            const data = await response.json();

            if (!response.ok) {
                let errorMsg = data.message || `Error del servidor: ${response.statusText}`;
                if (data.file) {
                    errorMsg += `\n\nArchivo: ${data.file}`;
                }
                if (data.line) {
                    errorMsg += `\nLínea: ${data.line}`;
                }
                console.error('Error completo:', data);
                throw new Error(errorMsg);
            }

            if (data.status === 'success') {
                return data;
            } else {
                throw new Error(data.message || 'Error desconocido del servidor');
            }
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error('La solicitud a Gemini tomó demasiado tiempo (>45s). Intenta con una solicitud más simple.');
            }
            
            throw error;
        }
    }

    /**
     * Llama a la API correspondiente (Excel o Power BI)
     */
    async function callDashboardAPI(action, data, fileId = null) {
        const apiEndpoint = outputType === 'excel' ? 'excel_api.php' : 'powerbi_api.php';
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const uniqueFileName = currentFileName || `Lucy_Dashboard_${timestamp}`;
        
        const payload = {
            action: action,
            [outputType === 'excel' ? 'fileId' : 'datasetId']: fileId,
            fileName: uniqueFileName,
            worksheets: data.worksheets || [],
            cellUpdates: data.cellUpdates || []
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);
        
        try {
            const response = await fetch(`${window.PF_CONFIG.app.baseURL}dao/lucyAI/${apiEndpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            const result = await response.json();

            if (!response.ok) {
                let errorMsg = result.message || `Error del servidor: ${response.statusText}`;
                if (result.file) {
                    errorMsg += `\n\nArchivo: ${result.file}`;
                }
                if (result.line) {
                    errorMsg += `\nLínea: ${result.line}`;
                }
                console.error('Error completo API:', result);
                throw new Error(errorMsg);
            }

            if (result.status === 'success') {
                return result.data;
            } else {
                throw new Error(result.message || 'Error en API');
            }
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error(`La creación del ${outputType === 'excel' ? 'Excel' : 'Power BI'} tomó demasiado tiempo (>45s).`);
            }
            
            throw error;
        }
    }

    // ==================== FUNCIONES DE UI ====================

    function showLoadingState() {
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Procesando...';
        resultContainer.style.display = 'block';
        loader.style.display = 'block';
        iframeContainer.style.display = 'none';
        powerbiIframe.src = '';
        
        updateLoadingMessage('Conectando con Lucy...', 0);
        
        resultContainer.scrollIntoView({ behavior: 'smooth' });
    }
    
    function updateLoadingMessage(message, step) {
        const loaderText = loader.querySelector('p:last-child');
        if (loaderText) {
            const steps = [
                'Analizando tu solicitud...',
                'Obteniendo datos de Premium Freight...',
                'Lucy está procesando con IA...',
                'Generando estructura del dashboard...',
                outputType === 'excel' ? 'Creando archivo Excel interactivo...' : 'Creando dataset en Power BI...',
                'Aplicando formato y visualizaciones...'
            ];
            
            loaderText.innerHTML = `<strong>${steps[step] || message}</strong><br><small class="text-muted">Esto puede tomar 10-30 segundos...</small>`;
        }
    }

    function showDashboardResult(embedUrl) {
        loader.style.display = 'none';
        
        powerbiIframe.src = embedUrl;
        iframeContainer.style.display = 'block';
        
        setTimeout(() => {
            try {
                const iframeDoc = powerbiIframe.contentDocument || powerbiIframe.contentWindow.document;
                console.log('Iframe cargado correctamente');
            } catch (e) {
                console.warn('Iframe bloqueado por CSP, mostrando alternativa');
                showAlternativeView(embedUrl);
            }
        }, 2000);
        
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i class="fas fa-cogs me-2"></i>Generar Dashboard';
    }
    
    function showPowerBIResult(apiResult) {
        loader.style.display = 'none';
        
        // Power BI requiere configuración especial del iframe con embed token
        const embedConfig = {
            type: 'report',
            embedUrl: apiResult.embedUrl,
            accessToken: apiResult.embedToken,
            tokenType: 1, // Embed token
            permissions: 7, // All permissions
            settings: {
                filterPaneEnabled: true,
                navContentPaneEnabled: true
            }
        };
        
        // Mostrar en iframe o alternativa
        if (apiResult.reportId) {
            // Si hay reportId, mostrar iframe embebido
            iframeContainer.innerHTML = `
                <div id="powerbi-embed-container" style="height: 600px;"></div>
            `;
            iframeContainer.style.display = 'block';
            
            // Aquí se debería usar Power BI JavaScript library para embed correcto
            // Por simplicidad, mostramos vista alternativa
            showPowerBIAlternativeView(apiResult);
        } else {
            // Si solo hay dataset, mostrar alternativa
            showPowerBIAlternativeView(apiResult);
        }
        
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i class="fas fa-cogs me-2"></i>Generar Dashboard';
    }
    
    function showPowerBIAlternativeView(apiResult) {
        iframeContainer.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; color: white;">
                <div style="font-size: 64px; margin-bottom: 20px;">
                    <i class="fas fa-chart-bar"></i>
                </div>
                <h2 style="margin-bottom: 10px; font-size: 28px;">Power BI Dataset Creado Exitosamente</h2>
                <p style="margin-bottom: 15px; font-size: 16px; opacity: 0.9;">
                    Tu dataset en Power BI está listo con todos los datos organizados.
                </p>
                <p style="margin-bottom: 30px; font-size: 14px; opacity: 0.8;">
                    <i class="fas fa-info-circle me-1"></i>
                    Puedes crear visualizaciones personalizadas en Power BI Service.
                </p>
                <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                    <a href="${apiResult.embedUrl}" target="_blank" class="btn btn-light btn-lg" style="min-width: 200px;">
                        <i class="fas fa-external-link-alt me-2"></i>
                        Abrir en Power BI
                    </a>
                </div>
                <p style="margin-top: 30px; font-size: 13px; opacity: 0.7;">
                    Dataset ID: ${apiResult.datasetId}
                </p>
            </div>
        `;
        iframeContainer.style.display = 'block';
    }
    
    function showAlternativeView(embedUrl) {
        iframeContainer.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; color: white;">
                <div style="font-size: 64px; margin-bottom: 20px;">
                    <i class="fas fa-file-excel"></i>
                </div>
                <h2 style="margin-bottom: 10px; font-size: 28px;">Dashboard Creado Exitosamente</h2>
                <p style="margin-bottom: 15px; font-size: 16px; opacity: 0.9;">
                    Tu archivo Excel interactivo está listo con datos, tablas y gráficos.
                </p>
                <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                    <a href="${embedUrl}" target="_blank" class="btn btn-light btn-lg" style="min-width: 200px;">
                        <i class="fas fa-external-link-alt me-2"></i>
                        Abrir en Excel Online
                    </a>
                    <button id="download-now-btn" class="btn btn-success btn-lg" style="min-width: 200px;">
                        <i class="fas fa-download me-2"></i>
                        Descargar Excel
                    </button>
                </div>
            </div>
        `;
        
        setTimeout(() => {
            const downloadNowBtn = document.getElementById('download-now-btn');
            if (downloadNowBtn) {
                downloadNowBtn.addEventListener('click', handleDownload);
            }
        }, 100);
    }

    function showChatInterface() {
        if (chatContainer) {
            chatContainer.style.display = 'block';
            setTimeout(() => {
                chatContainer.scrollIntoView({ behavior: 'smooth' });
            }, 500);
        }
    }

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
        
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

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

    function removeTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    function addMessageToHistory(role, content) {
        conversationHistory.push({
            role: role,
            content: content
        });
    }

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

    function showError(message) {
        loader.style.display = 'none';
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i class="fas fa-cogs me-2"></i>Generar Dashboard';
        
        const isConfigError = message.includes('no configurada') || 
                            message.includes('not configured') ||
                            message.includes('API Key') ||
                            message.includes('credentials');
        
        Swal.fire({
            icon: 'error',
            title: isConfigError ? 'Error de Configuración' : 'Oops... algo salió mal',
            html: `<div style="text-align: left;">
                <p><strong>Error:</strong></p>
                <pre style="background: #f5f5f5; padding: 10px; border-radius: 5px; font-size: 12px; max-height: 300px; overflow-y: auto;">${message}</pre>
                ${isConfigError ? '<p style="margin-top: 10px;"><strong>Acción requerida:</strong> Verifica la configuración de tus API keys.</p>' : ''}
            </div>`,
            confirmButtonColor: '#dc3545',
            width: '600px'
        });
    }

    console.log('Lucy Dashboard inicializado correctamente');
});