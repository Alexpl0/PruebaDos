// js/lucy_dashboard.js

document.addEventListener('DOMContentLoaded', () => {

    // Verificar si los elementos existen antes de añadir listeners
    const lucyForm = document.getElementById('lucy-form');
    if (!lucyForm) {
        console.error("El formulario de Lucy no se encontró en la página.");
        return;
    }

    // Referencias a los elementos del DOM
    const promptInput = document.getElementById('prompt-input');
    const resultContainer = document.getElementById('dashboard-result-container');
    const loader = document.getElementById('loader');
    const iframeContainer = document.getElementById('iframe-container');
    const powerbiIframe = document.getElementById('powerbi-iframe');

    // Listener para el envío del formulario
    lucyForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Evitar el envío real del formulario

        const userPrompt = promptInput.value.trim();

        // Validación simple del prompt
        if (userPrompt === "") {
            Swal.fire({
                icon: 'warning',
                title: 'Instrucción vacía',
                text: 'Por favor, describe el dashboard que necesitas.',
                confirmButtonColor: 'var(--grammer-blue)'
            });
            return;
        }

        // Iniciar el proceso de carga
        showLoadingState();

        // --- SIMULACIÓN DE LLAMADA AL BACKEND ---
        // En una implementación real, aquí harías una llamada fetch a tu API de backend.
        // Tu backend procesaría el `userPrompt` y devolvería la URL del Power BI.

        // TODO: Reemplazar esta simulación con una llamada fetch real.
        simulateBackendCall(userPrompt);
    });

    /**
     * Muestra el contenedor de resultados y el spinner de carga.
     */
    function showLoadingState() {
        resultContainer.style.display = 'block';
        loader.style.display = 'block';
        iframeContainer.style.display = 'none';
        powerbiIframe.src = ''; // Limpiar iframe anterior
        // Scroll suave hacia el área de resultados
        resultContainer.scrollIntoView({ behavior: 'smooth' });
    }

    /**
     * Oculta el spinner y muestra el iframe con el dashboard.
     * @param {string} dashboardUrl - La URL del Power BI a cargar.
     */
    function showDashboardResult(dashboardUrl) {
        loader.style.display = 'none';
        powerbiIframe.src = dashboardUrl;
        iframeContainer.style.display = 'block';
    }

    /**
     * Función para simular la llamada al backend.
     * @param {string} prompt - El prompt del usuario.
     */
    function simulateBackendCall(prompt) {
        console.log("Enviando prompt al backend (simulado):", prompt);

        // Simula un retraso de red de 2.5 segundos
        setTimeout(() => {
            // URL de ejemplo actualizada a un reporte público de Microsoft más estable.
            // Tu backend debería devolver una URL real generada por tu sistema.
            const fakeDashboardUrl = "https://app.powerbi.com/view?r=eyJrIjoiZWIzN2Q2MjktY2ZkZS00ZDZlLTk0YjctZGQ4YjkyN2FlZDE2IiwidCI6IjcwOTk0YjgxLTY2YzYtNDBkMi05M2FkLWMxYWU5MDUxMDM4MSIsImMiOjh9";
            
            showDashboardResult(fakeDashboardUrl);

        }, 2500);
    }


    // --- EJEMPLO DE LLAMADA FETCH REAL (PARA CUANDO CONECTES TU BACKEND) ---
    /*
    async function getDashboardFromBackend(prompt) {
        try {
            // Asegúrate de que PF_CONFIG.app.baseURL esté definido en tu config.js
            const apiEndpoint = `${window.PF_CONFIG.app.baseURL}dao/ia/generateDashboard.php`;

            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prompt: prompt })
            });

            if (!response.ok) {
                throw new Error(`Error del servidor: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success && data.url) {
                showDashboardResult(data.url);
            } else {
                throw new Error(data.message || "La respuesta del servidor no fue exitosa.");
            }

        } catch (error) {
            console.error("Error al generar el dashboard:", error);
            loader.style.display = 'none'; // Ocultar loader en caso de error
            Swal.fire({
                icon: 'error',
                title: 'Oops... algo salió mal',
                text: `No se pudo generar el dashboard. Error: ${error.message}`,
                confirmButtonColor: 'var(--danger)'
            });
        }
    }
    */
    // Para usar la función real, reemplazarías `simulateBackendCall(userPrompt);`
    // con `getDashboardFromBackend(userPrompt);` en el listener del formulario.

});
