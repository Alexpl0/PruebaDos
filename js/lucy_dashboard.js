// js/lucy_dashboard_DEBUG.js - Version temporal SOLO PARA DEBUG
// Reemplaza temporalmente lucy_dashboard.js para probar SOLO Gemini

document.addEventListener('DOMContentLoaded', () => {
    // ==================== VARIABLES GLOBALES ====================
    let conversationHistory = [];
    let isProcessing = false;

    // ==================== REFERENCIAS DOM ====================
    const lucyForm = document.getElementById('lucy-form');
    const promptInput = document.getElementById('prompt-input');
    const generateBtn = document.getElementById('generate-dashboard-btn');
    const resultContainer = document.getElementById('dashboard-result-container');
    const loader = document.getElementById('loader');
    const iframeContainer = document.getElementById('iframe-container');

    if (!lucyForm) {
        console.error("El formulario de Lucy no se encontró en la página.");
        return;
    }

    // ==================== EVENT LISTENERS ====================
    lucyForm.addEventListener('submit', handleInitialRequest);

    // ==================== FUNCIÓN PRINCIPAL ====================
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
        
        console.log('🚀 DEBUG MODE: Solo probando Gemini (sin Excel)');
        
        try {
            const startTime = Date.now();
            
            // Llamar a Gemini
            console.log('⏰ Llamando a Gemini...');
            const geminiResponse = await callGeminiProcessor(userPrompt);
            
            const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log(`✅ Gemini respondió en ${elapsedTime}s`);
            
            // MOSTRAR RESULTADO EN EL IFRAME (como JSON formateado)
            hideLoader();
            showJsonResult(geminiResponse, elapsedTime);
            
            Swal.fire({
                icon: 'success',
                title: '¡Gemini respondió correctamente!',
                html: `
                    <p>Tiempo total: <strong>${elapsedTime}s</strong></p>
                    <p>El JSON generado se muestra abajo.</p>
                    ${geminiResponse.debug ? `<p><small>Data fetch: ${geminiResponse.debug.dataFetchTime}s | Gemini: ${geminiResponse.debug.geminiTime}s</small></p>` : ''}
                `,
                confirmButtonColor: '#4472C4'
            });
            
        } catch (error) {
            console.error("❌ Error:", error);
            hideLoader();
            
            Swal.fire({
                icon: 'error',
                title: 'Error en Gemini',
                html: `<pre style="text-align: left; max-height: 300px; overflow-y: auto;">${error.message}</pre>`,
                confirmButtonColor: '#dc3545'
            });
        } finally {
            isProcessing = false;
            generateBtn.disabled = false;
            generateBtn.innerHTML = '<i class="fas fa-cogs me-2"></i>Generar Dashboard';
        }
    }

    // ==================== FUNCIONES DE API ====================
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
                    fileId: null
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            const data = await response.json();

            if (!response.ok) {
                let errorMsg = data.message || `Error del servidor: ${response.statusText}`;
                if (data.file) errorMsg += `\n\nArchivo: ${data.file}`;
                if (data.line) errorMsg += `\nLínea: ${data.line}`;
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
                throw new Error('La solicitud a Gemini tomó demasiado tiempo (>45s). Intenta con una solicitud más simple o verifica tu conexión.');
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
        
        const loaderText = loader.querySelector('p:last-child');
        if (loaderText) {
            loaderText.innerHTML = `<strong>🤖 Probando solo Gemini (DEBUG MODE)...</strong><br><small class="text-muted">Sin crear Excel todavía...</small>`;
        }
        
        resultContainer.scrollIntoView({ behavior: 'smooth' });
    }

    function hideLoader() {
        loader.style.display = 'none';
    }

    function showJsonResult(geminiResponse, elapsedTime) {
        // Crear HTML con el JSON formateado
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: 'Courier New', monospace;
                        padding: 20px;
                        background: #1e1e1e;
                        color: #d4d4d4;
                    }
                    h2 {
                        color: #4ec9b0;
                        border-bottom: 2px solid #4ec9b0;
                        padding-bottom: 10px;
                    }
                    .section {
                        margin: 20px 0;
                        padding: 15px;
                        background: #252526;
                        border-left: 4px solid #007acc;
                        border-radius: 4px;
                    }
                    .label {
                        color: #569cd6;
                        font-weight: bold;
                    }
                    pre {
                        background: #1e1e1e;
                        padding: 15px;
                        border-radius: 5px;
                        overflow-x: auto;
                        border: 1px solid #3e3e3e;
                    }
                    .success { color: #4ec9b0; }
                    .time { color: #ce9178; }
                </style>
            </head>
            <body>
                <h2>✅ Gemini Response - DEBUG MODE</h2>
                
                <div class="section">
                    <div class="label">⏱️ Tiempo de respuesta:</div>
                    <div class="time">${elapsedTime}s</div>
                </div>

                ${geminiResponse.debug ? `
                <div class="section">
                    <div class="label">📊 Debug Info:</div>
                    <pre>${JSON.stringify(geminiResponse.debug, null, 2)}</pre>
                </div>
                ` : ''}

                <div class="section">
                    <div class="label">💬 Mensaje de Lucy:</div>
                    <div>${geminiResponse.geminiResponse || 'Sin mensaje'}</div>
                </div>

                <div class="section">
                    <div class="label">📋 Estructura Excel generada:</div>
                    <pre>${JSON.stringify(geminiResponse.excelData, null, 2)}</pre>
                </div>

                <div class="section">
                    <div class="label">🎬 Acción:</div>
                    <div class="success">${geminiResponse.action}</div>
                </div>
            </body>
            </html>
        `;

        // Mostrar en iframe
        const iframe = document.getElementById('powerbi-iframe');
        iframe.srcdoc = html;
        iframeContainer.style.display = 'block';
    }

    console.log('🔧 Lucy Dashboard DEBUG MODE inicializado');
    console.log('⚠️ Esta versión SOLO prueba Gemini, NO crea archivos Excel');
});