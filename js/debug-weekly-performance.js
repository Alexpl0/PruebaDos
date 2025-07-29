/**
 * DEBUG SCRIPT PARA WEEKLY PERFORMANCE DASHBOARD
 * Usa este script en la consola del navegador para debuggear problemas
 */

// Función para verificar el estado del dashboard
function debugDashboard() {
    console.log('=== WEEKLY PERFORMANCE DASHBOARD DEBUG ===');
    
    // 1. Verificar variables globales
    console.log('1. Variables globales:');
    console.log('- weeklyData:', weeklyData);
    console.log('- charts:', charts);
    console.log('- availablePlants:', availablePlants);
    console.log('- selectedPlant:', selectedPlant);
    console.log('- currentWeek:', currentWeek);
    
    // 2. Verificar URLs
    console.log('2. URLs de endpoints:');
    console.log('- WEEKLY_KPIS_URL:', WEEKLY_KPIS_URL);
    console.log('- PLANTS_URL:', PLANTS_URL);
    
    // 3. Verificar elementos DOM
    console.log('3. Elementos DOM importantes:');
    const elements = [
        'plantSelector',
        'weekDisplay',
        'exportExcel',
        'exportPDF',
        'printReport',
        'trendsChart',
        'statusChart',
        'topPerformersChart'
    ];
    
    elements.forEach(id => {
        const el = document.getElementById(id);
        console.log(`- ${id}:`, el ? 'Found' : 'NOT FOUND');
    });
    
    // 4. Verificar librerías
    console.log('4. Librerías disponibles:');
    console.log('- ApexCharts:', typeof ApexCharts !== 'undefined' ? 'Available' : 'NOT AVAILABLE');
    console.log('- XLSX:', typeof XLSX !== 'undefined' ? 'Available' : 'NOT AVAILABLE');
    console.log('- jsPDF:', typeof window.jspdf !== 'undefined' ? 'Available' : 'NOT AVAILABLE');
    console.log('- SweetAlert2:', typeof Swal !== 'undefined' ? 'Available' : 'NOT AVAILABLE');
    console.log('- moment:', typeof moment !== 'undefined' ? 'Available' : 'NOT AVAILABLE');
    
    console.log('=== FIN DEBUG ===');
}

// Función para testear carga de plantas
async function testPlants() {
    console.log('=== TESTING PLANT LOADING ===');
    
    try {
        console.log('Testing plant loading from:', PLANTS_URL);
        const plants = await loadAvailablePlants();
        console.log('Plants loaded successfully:', plants);
        
        const selector = document.getElementById('plantSelector');
        if (selector) {
            console.log('Plant selector options:', Array.from(selector.options).map(opt => opt.value));
        }
        
    } catch (error) {
        console.error('Error testing plants:', error);
    }
    
    console.log('=== FIN TEST PLANTS ===');
}

// Función para testear carga de datos
async function testDataLoading() {
    console.log('=== TESTING DATA LOADING ===');
    
    try {
        console.log('Testing data loading from:', WEEKLY_KPIS_URL);
        const data = await loadWeeklyData();
        console.log('Data loaded successfully:', data);
        
        // Verificar estructura de datos
        console.log('Data structure verification:');
        console.log('- total_generated:', data.total_generated);
        console.log('- top_performers:', data.top_performers?.length || 0, 'items');
        console.log('- area_performance:', data.area_performance?.length || 0, 'items');
        console.log('- approval_times_distribution:', data.approval_times_distribution?.length || 0, 'items');
        console.log('- daily_costs:', data.daily_costs?.length || 0, 'items');
        
    } catch (error) {
        console.error('Error testing data loading:', error);
    }
    
    console.log('=== FIN TEST DATA ===');
}

// Función para testear las gráficas - MEJORADA
function testCharts() {
    console.log('=== TESTING CHARTS ===');
    
    const chartInfo = [
        { key: 'trends', id: 'trendsChart' },
        { key: 'status', id: 'statusChart' },
        { key: 'topPerformers', id: 'topPerformersChart' },
        { key: 'areaPerformance', id: 'areaPerformanceChart' },
        { key: 'approvalTimes', id: 'approvalTimesChart' },
        { key: 'costAnalysis', id: 'costAnalysisChart' }
    ];
    
    chartInfo.forEach(info => {
        const chart = charts[info.key];
        const container = document.getElementById(info.id);
        
        console.log(`Chart ${info.key}:`);
        console.log(`- Object exists:`, chart ? 'Yes' : 'No');
        console.log(`- Container exists:`, container ? 'Yes' : 'No');
        
        if (chart) {
            console.log(`- Has dataURI method:`, typeof chart.dataURI === 'function');
            console.log(`- Element ID:`, chart.el?.id || 'Unknown');
        }
        
        if (container) {
            const svg = container.querySelector('svg');
            if (svg) {
                console.log(`- SVG width:`, svg.getAttribute('width'));
                console.log(`- SVG height:`, svg.getAttribute('height'));
                console.log(`- Is visible:`, isElementVisible(container));
            } else {
                console.log(`- No SVG found in container`);
            }
        }
        
        console.log('---');
    });
    
    console.log('=== FIN TEST CHARTS ===');
}

// Función para testear específicamente la exportación PDF
async function testPDFExport() {
    console.log('=== TESTING PDF EXPORT SPECIFICALLY ===');
    
    try {
        // Verificar que todas las gráficas estén listas
        const chartsReady = await waitForAllChartsReady();
        console.log('All charts ready:', chartsReady);
        
        // Testear cada gráfica individualmente
        const chartInfo = [
            { key: 'trends', id: 'trendsChart' },
            { key: 'status', id: 'statusChart' },
            { key: 'topPerformers', id: 'topPerformersChart' },
            { key: 'areaPerformance', id: 'areaPerformanceChart' },
            { key: 'approvalTimes', id: 'approvalTimesChart' },
            { key: 'costAnalysis', id: 'costAnalysisChart' }
        ];
        
        for (const info of chartInfo) {
            const chart = charts[info.key];
            const container = document.getElementById(info.id);
            
            console.log(`Testing ${info.key}:`);
            
            if (!chart || !container) {
                console.log(`- SKIP: Chart or container missing`);
                continue;
            }
            
            if (!isElementVisible(container)) {
                console.log(`- SKIP: Container not visible`);
                continue;
            }
            
            const isReady = isChartReady(info.id, chart);
            console.log(`- Is ready:`, isReady);
            
            if (isReady) {
                try {
                    const imageData = await getChartImage(chart);
                    console.log(`- Image generated:`, imageData ? 'Success' : 'Failed');
                    
                    if (imageData) {
                        console.log(`- Image size:`, imageData.length, 'characters');
                    }
                } catch (error) {
                    console.log(`- Image generation error:`, error.message);
                }
            }
            
            console.log('---');
        }
        
    } catch (error) {
        console.error('Error testing PDF export:', error);
    }
    
    console.log('=== FIN TEST PDF EXPORT ===');
}

// Función para testear exportación
async function testExport() {
    console.log('=== TESTING EXPORT FUNCTIONS ===');
    
    try {
        // Test Excel data preparation
        const excelData = prepareExcelData();
        console.log('Excel data prepared:', Object.keys(excelData));
        
        // Verificar cada hoja de Excel
        Object.entries(excelData).forEach(([sheetName, sheetData]) => {
            console.log(`Sheet "${sheetName}":`, sheetData.data.length, 'rows');
        });
        
        // Test export buttons
        const exportButtons = ['exportExcel', 'exportPDF', 'printReport'];
        exportButtons.forEach(id => {
            const btn = document.getElementById(id);
            console.log(`Button ${id}:`, btn ? 'Found' : 'NOT FOUND');
            if (btn) {
                console.log(`- Disabled:`, btn.disabled);
                console.log(`- Has click listener:`, btn.onclick !== null);
            }
        });
        
        // Test específico de PDF
        await testPDFExport();
        
    } catch (error) {
        console.error('Error testing export:', error);
    }
    
    console.log('=== FIN TEST EXPORT ===');
}

// Función para ejecutar todos los tests
async function runAllTests() {
    console.log('🚀 INICIANDO TESTS COMPLETOS DEL DASHBOARD...\n');
    
    debugDashboard();
    await testPlants();
    await testDataLoading();
    testCharts();
    await testExport();
    
    console.log('✅ TESTS COMPLETADOS - Revisa los logs anteriores para identificar problemas');
}

// Función para limpiar y reinicializar
async function resetDashboard() {
    console.log('🔄 REINICIALIZANDO DASHBOARD...');
    
    // Limpiar charts existentes
    Object.values(charts).forEach(chart => {
        if (chart && typeof chart.destroy === 'function') {
            chart.destroy();
        }
    });
    
    // Limpiar objeto charts
    Object.keys(charts).forEach(key => delete charts[key]);
    
    // Reinicializar
    await initializeWeeklyPerformance();
    
    console.log('✅ DASHBOARD REINICIALIZADO');
}

// Función para forzar exportación PDF (para debugging)
async function forcePDFExport() {
    console.log('🔧 FORZANDO EXPORTACIÓN PDF PARA DEBUG...');
    
    try {
        // Esperar a que las gráficas estén listas
        console.log('Esperando que las gráficas estén listas...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Ejecutar exportación
        await exportToPDF();
        
    } catch (error) {
        console.error('Error en exportación forzada:', error);
    }
}

// Instrucciones de uso
console.log(`
📋 FUNCIONES DE DEBUG DISPONIBLES:

debugDashboard()     - Verificar estado general
testPlants()         - Testear carga de plantas
testDataLoading()    - Testear carga de datos
testCharts()         - Testear gráficas
testPDFExport()      - Testear exportación PDF específicamente
testExport()         - Testear funciones de exportación
runAllTests()        - Ejecutar todos los tests
resetDashboard()     - Limpiar y reinicializar
forcePDFExport()     - Forzar exportación PDF para debug

💡 Si la exportación PDF falla:
1. Ejecuta testPDFExport() para diagnóstico específico
2. Usa forcePDFExport() para intentar forzar la exportación
3. Usa runAllTests() para un diagnóstico completo
`);

// Hacer las funciones disponibles globalmente
window.debugWeeklyPerformance = {
    debugDashboard,
    testPlants,
    testDataLoading,
    testCharts,
    testPDFExport,
    testExport,
    runAllTests,
    resetDashboard,
    forcePDFExport
};