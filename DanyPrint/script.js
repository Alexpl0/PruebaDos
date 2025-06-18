// Project: Client-Side Excel Printer Web App Logic - Fixed for XLS files

// Get references to the DOM elements
const fileInput = document.getElementById('fileInput');
const paperSizeSelect = document.getElementById('paperSizeSelect');
const printButton = document.getElementById('printButton');
const resetButton = document.getElementById('resetButton');
const loading = document.getElementById('loading');
const sheetSelector = document.getElementById('sheetSelector');
const loadSelectedButton = document.getElementById('loadSelectedButton');
const body = document.body;

let luckysheetsInstance = null;
let currentWorkbook = null;
let currentFile = null;

// Enhanced error logging function
function logError(error, context = '', additionalData = {}) {
    const timestamp = new Date().toISOString();
    console.group(`❌ ERROR in ${context}`);
    console.error('Timestamp:', timestamp);
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    console.error('Additional Data:', additionalData);
    console.error('Full Error Object:', error);
    console.groupEnd();
}

function logWarning(message, context = '', data = {}) {
    console.group(`⚠️ WARNING in ${context}`);
    console.warn(message);
    if (Object.keys(data).length > 0) {
        console.table(data);
    }
    console.groupEnd();
}

function logInfo(message, context = '', data = {}) {
    console.group(`ℹ️ INFO in ${context}`);
    console.info(message);
    if (Object.keys(data).length > 0) {
        console.table(data);
    }
    console.groupEnd();
}

// Verificar librerías al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    try {
        logInfo('Starting library verification', 'DOMContentLoaded');
        
        if (typeof XLSX === 'undefined') {
            throw new Error('XLSX library not loaded');
        }
        
        if (typeof luckysheet === 'undefined') {
            throw new Error('Luckysheet library not loaded');
        }
        
        logInfo('✅ Librerías cargadas correctamente', 'DOMContentLoaded', {
            'XLSX Version': XLSX.version,
            'User Agent': navigator.userAgent,
            'Memory': performance.memory ? {
                used: (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2) + 'MB',
                total: (performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2) + 'MB'
            } : 'Not available'
        });
        
        paperSizeSelect.dispatchEvent(new Event('change'));
    } catch (error) {
        logError(error, 'DOMContentLoaded');
        alert('Error: No se pudieron cargar las librerías necesarias. Verifica tu conexión a internet.');
    }
});

// Add event listener to the file input
fileInput.addEventListener('change', function(event) {
    try {
        const file = event.target.files[0];
        if (!file) {
            logWarning('No file selected', 'fileInput');
            return;
        }

        const fileInfo = {
            name: file.name,
            size: (file.size / 1024 / 1024).toFixed(2) + 'MB',
            type: file.type,
            extension: file.name.split('.').pop().toLowerCase(),
            lastModified: new Date(file.lastModified).toISOString()
        };

        logInfo('📁 Archivo seleccionado', 'fileInput', fileInfo);

        // Verificar tamaño del archivo (límite de 100MB)
        const maxSize = 100 * 1024 * 1024; // 100MB
        if (file.size > maxSize) {
            const errorMsg = `El archivo es demasiado grande (${fileInfo.size}). El límite es 100MB.`;
            logError(new Error(errorMsg), 'fileInput - Size Validation', fileInfo);
            alert(errorMsg);
            return;
        }

        currentFile = file;

        // Show loading
        loading.innerHTML = '<p>🔄 Analizando archivo... Detectando hojas disponibles...</p>';
        loading.style.display = 'block';
        
        // Hide other elements
        sheetSelector.style.display = 'none';
        printButton.style.display = 'none';
        resetButton.style.display = 'none';
        
        // Process the Excel file to get sheet info
        setTimeout(() => {
            analyzeExcelFile(file);
        }, 100);
        
    } catch (error) {
        logError(error, 'fileInput addEventListener', {
            eventType: event.type,
            filesCount: event.target.files.length
        });
        alert('Error al procesar la selección de archivo: ' + error.message);
        loading.style.display = 'none';
    }
});

// Multiple strategies for reading Excel files - ENHANCED VERSION
function analyzeExcelFile(file) {
    const reader = new FileReader();
    
    reader.onerror = function(e) {
        logError(new Error('FileReader failed'), 'analyzeExcelFile', {
            error: e,
            readyState: reader.readyState,
            fileName: file.name
        });
        alert('Error al leer el archivo. El archivo puede estar corrupto.');
        loading.style.display = 'none';
    };
    
    reader.onload = function(e) {
        try {
            logInfo('🔄 Analizando archivo...', 'analyzeExcelFile', {
                bytesRead: e.target.result.byteLength,
                fileName: file.name,
                fileExtension: file.name.split('.').pop().toLowerCase()
            });
            
            const data = new Uint8Array(e.target.result);
            const fileExtension = file.name.split('.').pop().toLowerCase();
            
            // Strategy 1: Try basic read first
            let readStrategies = [];
            
            if (fileExtension === 'xls') {
                // XLS files need different strategies
                readStrategies = [
                    {
                        name: 'XLS Basic Read',
                        options: {
                            type: 'array',
                            bookVBA: false,
                            bookSheets: true,
                            bookProps: true
                        }
                    },
                    {
                        name: 'XLS Minimal Read',
                        options: {
                            type: 'array'
                        }
                    },
                    {
                        name: 'XLS Legacy Read',
                        options: {
                            type: 'array',
                            bookVBA: false,
                            bookSheets: true,
                            cellStyles: false,
                            cellNF: false,
                            cellHTML: false,
                            cellDates: true,
                            sheetStubs: true,
                            dense: false
                        }
                    },
                    {
                        name: 'XLS Force Read',
                        options: {
                            type: 'array',
                            raw: true,
                            codepage: 1252
                        }
                    }
                ];
            } else {
                // XLSX files
                readStrategies = [
                    {
                        name: 'XLSX Standard Read',
                        options: {
                            type: 'array',
                            bookSheets: true,
                            bookProps: true,
                            cellStyles: false,
                            cellNF: false,
                            cellHTML: false,
                            cellDates: false,
                            sheetStubs: false,
                            dense: false,
                            sheetRows: 1
                        }
                    },
                    {
                        name: 'XLSX Basic Read',
                        options: {
                            type: 'array',
                            bookSheets: true,
                            bookProps: true
                        }
                    },
                    {
                        name: 'XLSX Minimal Read',
                        options: {
                            type: 'array'
                        }
                    }
                ];
            }
            
            let workbook = null;
            let lastError = null;
            
            // Try each strategy until one works
            for (let i = 0; i < readStrategies.length; i++) {
                const strategy = readStrategies[i];
                try {
                    logInfo(`Trying strategy: ${strategy.name}`, 'analyzeExcelFile', strategy.options);
                    
                    workbook = XLSX.read(data, strategy.options);
                    
                    // Validate the result
                    if (workbook && workbook.SheetNames && Array.isArray(workbook.SheetNames) && workbook.SheetNames.length > 0) {
                        logInfo(`✅ Strategy "${strategy.name}" succeeded`, 'analyzeExcelFile', {
                            sheetsFound: workbook.SheetNames.length,
                            sheetNames: workbook.SheetNames,
                            hasSheets: !!workbook.Sheets
                        });
                        
                        // If Sheets object is missing, try to create it
                        if (!workbook.Sheets) {
                            logWarning('Sheets object missing, attempting to create...', 'analyzeExcelFile');
                            
                            // Try to read again with full data to get Sheets
                            try {
                                const fullWorkbook = XLSX.read(data, {
                                    type: 'array',
                                    bookSheets: true,
                                    bookProps: true,
                                    cellStyles: false,
                                    cellNF: false,
                                    cellHTML: false,
                                    cellDates: true,
                                    sheetStubs: true
                                });
                                
                                if (fullWorkbook && fullWorkbook.Sheets) {
                                    workbook.Sheets = fullWorkbook.Sheets;
                                    logInfo('✅ Sheets object created successfully', 'analyzeExcelFile');
                                } else {
                                    throw new Error('Could not create Sheets object');
                                }
                            } catch (sheetsError) {
                                logWarning('Failed to create Sheets object, will create manually', 'analyzeExcelFile', {
                                    error: sheetsError.message
                                });
                                
                                // Create empty Sheets object as fallback
                                workbook.Sheets = {};
                                workbook.SheetNames.forEach(sheetName => {
                                    workbook.Sheets[sheetName] = {
                                        '!ref': 'A1:A1',
                                        'A1': { v: 'Datos no disponibles', t: 's' }
                                    };
                                });
                            }
                        }
                        
                        break; // Strategy worked, exit loop
                    } else {
                        throw new Error('Invalid workbook structure after read');
                    }
                    
                } catch (strategyError) {
                    lastError = strategyError;
                    logWarning(`Strategy "${strategy.name}" failed`, 'analyzeExcelFile', {
                        error: strategyError.message,
                        workbookExists: !!workbook,
                        hasSheetNames: !!(workbook && workbook.SheetNames)
                    });
                    workbook = null;
                    continue;
                }
            }
            
            // If all strategies failed
            if (!workbook) {
                throw new Error(`All read strategies failed. Last error: ${lastError ? lastError.message : 'Unknown error'}`);
            }
            
            currentWorkbook = workbook;

            // Final validation with detailed logging
            const validationInfo = {
                workbookExists: !!currentWorkbook,
                hasSheetNames: !!(currentWorkbook && currentWorkbook.SheetNames),
                sheetNamesType: currentWorkbook && currentWorkbook.SheetNames ? typeof currentWorkbook.SheetNames : 'undefined',
                sheetNamesIsArray: currentWorkbook && currentWorkbook.SheetNames ? Array.isArray(currentWorkbook.SheetNames) : false,
                sheetNamesLength: currentWorkbook && currentWorkbook.SheetNames ? currentWorkbook.SheetNames.length : 0,
                hasSheets: !!(currentWorkbook && currentWorkbook.Sheets),
                sheetsType: currentWorkbook && currentWorkbook.Sheets ? typeof currentWorkbook.Sheets : 'undefined',
                sheetsKeys: currentWorkbook && currentWorkbook.Sheets ? Object.keys(currentWorkbook.Sheets) : []
            };

            logInfo('Final workbook validation', 'analyzeExcelFile', validationInfo);

            const workbookInfo = {
                sheetsCount: currentWorkbook.SheetNames.length,
                sheetNames: currentWorkbook.SheetNames,
                availableSheets: Object.keys(currentWorkbook.Sheets || {}),
                sheetsObjectExists: !!currentWorkbook.Sheets,
                props: currentWorkbook.Props || 'No props'
            };

            logInfo('✅ Archivo analizado correctamente', 'analyzeExcelFile', workbookInfo);

            // Validate sheet accessibility
            const missingSheets = [];
            const availableSheets = [];
            const sheetValidationErrors = [];
            
            currentWorkbook.SheetNames.forEach(sheetName => {
                try {
                    if (currentWorkbook.Sheets && currentWorkbook.Sheets.hasOwnProperty(sheetName)) {
                        const sheet = currentWorkbook.Sheets[sheetName];
                        if (sheet && typeof sheet === 'object') {
                            availableSheets.push(sheetName);
                        } else {
                            sheetValidationErrors.push(`Sheet "${sheetName}" exists but is not a valid object`);
                        }
                    } else {
                        missingSheets.push(sheetName);
                    }
                } catch (sheetCheckError) {
                    sheetValidationErrors.push(`Error checking sheet "${sheetName}": ${sheetCheckError.message}`);
                }
            });

            if (missingSheets.length > 0) {
                logWarning('Some sheets from SheetNames not found in Sheets object', 'analyzeExcelFile', {
                    missingSheets: missingSheets,
                    availableSheets: availableSheets,
                    totalSheetNames: currentWorkbook.SheetNames.length,
                    totalSheetsObject: Object.keys(currentWorkbook.Sheets || {}).length
                });
            }

            if (sheetValidationErrors.length > 0) {
                logWarning('Sheet validation errors found', 'analyzeExcelFile', {
                    errors: sheetValidationErrors
                });
            }

            if (availableSheets.length === 0) {
                // Last resort: try to make all sheets available with dummy data
                logWarning('No accessible sheets found, creating dummy sheets', 'analyzeExcelFile');
                
                currentWorkbook.SheetNames.forEach(sheetName => {
                    if (!currentWorkbook.Sheets[sheetName]) {
                        currentWorkbook.Sheets[sheetName] = {
                            '!ref': 'A1:A1',
                            'A1': { 
                                v: `Hoja "${sheetName}" - Datos no disponibles o formato no compatible`, 
                                t: 's' 
                            }
                        };
                        availableSheets.push(sheetName);
                    }
                });
                
                if (availableSheets.length === 0) {
                    throw new Error(`No se pudieron crear hojas accesibles. Archivo posiblemente corrupto o en formato no soportado.`);
                }
            }

            // Update SheetNames to only include accessible sheets
            currentWorkbook.SheetNames = availableSheets;

            logInfo(`Sheet accessibility check complete: ${availableSheets.length} sheets accessible`, 'analyzeExcelFile');

            // Show sheet selector
            showSheetSelector(currentWorkbook);
            
        } catch (error) {
            logError(error, 'analyzeExcelFile - Complete Process', {
                fileName: file.name,
                fileSize: file.size,
                fileExtension: file.name.split('.').pop().toLowerCase(),
                dataLength: e.target.result ? e.target.result.byteLength : 'N/A',
                workbookExists: !!currentWorkbook,
                sheetNamesExists: !!(currentWorkbook && currentWorkbook.SheetNames),
                sheetsExists: !!(currentWorkbook && currentWorkbook.Sheets),
                sheetNames: currentWorkbook && currentWorkbook.SheetNames ? currentWorkbook.SheetNames : 'N/A',
                availableKeys: currentWorkbook && currentWorkbook.Sheets ? Object.keys(currentWorkbook.Sheets) : 'N/A'
            });
            
            let errorMessage = 'Error al analizar el archivo Excel.';
            
            if (file.name.split('.').pop().toLowerCase() === 'xls') {
                errorMessage = 'Error al procesar archivo XLS (formato Excel antiguo). ';
                if (error.message.includes('Sheets')) {
                    errorMessage += 'El archivo puede estar corrupto o usar características no soportadas del formato XLS.';
                } else if (error.message.includes('strategies failed')) {
                    errorMessage += 'No se pudo leer el archivo con ninguno de los métodos disponibles. Intenta guardar el archivo como .xlsx en Excel.';
                } else {
                    errorMessage += 'Formato XLS no completamente compatible.';
                }
            } else {
                if (error.message.includes('Invalid or unsupported')) {
                    errorMessage = 'Formato de archivo no soportado o archivo corrupto.';
                } else if (error.message.includes('password')) {
                    errorMessage = 'El archivo está protegido con contraseña.';
                } else if (error.message.includes('Unsupported file')) {
                    errorMessage = 'Archivo Excel no soportado o corrupto.';
                } else if (error.message.includes('strategies failed')) {
                    errorMessage = 'No se pudo procesar el archivo con ninguno de los métodos disponibles. El archivo puede estar corrupto.';
                }
            }
            
            alert(`${errorMessage}\n\n💡 Sugerencia: Si es un archivo .xls, intenta abrirlo en Excel y guardarlo como .xlsx\n\nError técnico: ${error.message}\nConsulta la consola del navegador para más detalles.`);
            loading.style.display = 'none';
        }
    };
    
    reader.readAsArrayBuffer(file);
}

// Enhanced show sheet selector interface
function showSheetSelector(workbook) {
    try {
        loading.style.display = 'none';
        
        logInfo('Building sheet selector interface', 'showSheetSelector', {
            totalSheets: workbook.SheetNames.length,
            sheetNames: workbook.SheetNames
        });
        
        // Analyze each sheet to get size info with error handling
        const sheetInfo = [];
        const sheetErrors = [];
        
        workbook.SheetNames.forEach((sheetName, index) => {
            try {
                logInfo(`Analyzing sheet: ${sheetName}`, 'showSheetSelector', {
                    index: index,
                    sheetName: sheetName
                });

                // Validate sheet name and access
                if (!sheetName || typeof sheetName !== 'string') {
                    throw new Error(`Invalid sheet name: ${sheetName}`);
                }

                const worksheet = workbook.Sheets[sheetName];
                
                if (!worksheet) {
                    throw new Error(`Sheet not found in Sheets object: "${sheetName}"`);
                }

                let cellCount = 0;
                let range = 'Vacía';
                let rows = 0;
                let cols = 0;
                
                // Enhanced range detection
                if (worksheet['!ref']) {
                    try {
                        const sheetRange = XLSX.utils.decode_range(worksheet['!ref']);
                        rows = sheetRange.e.r + 1;
                        cols = sheetRange.e.c + 1;
                        cellCount = rows * cols;
                        range = `${rows} filas × ${cols} columnas`;
                    } catch (rangeError) {
                        logWarning(`Error decoding range for sheet "${sheetName}"`, 'showSheetSelector', {
                            ref: worksheet['!ref'],
                            error: rangeError.message
                        });
                        range = 'Error en rango';
                        // Try to estimate from available data
                        const cellKeys = Object.keys(worksheet).filter(key => key[0] !== '!');
                        cellCount = cellKeys.length;
                        range = `~${cellCount} celdas detectadas`;
                    }
                } else {
                    // No range defined, try to count cells manually
                    const cellKeys = Object.keys(worksheet).filter(key => key[0] !== '!');
                    if (cellKeys.length > 0) {
                        cellCount = cellKeys.length;
                        range = `~${cellCount} celdas sin rango definido`;
                    } else {
                        range = 'Hoja vacía o sin datos detectables';
                    }
                }
                
                const info = {
                    name: sheetName,
                    index: index,
                    cellCount: cellCount,
                    range: range,
                    rows: rows,
                    cols: cols
                };
                
                sheetInfo.push(info);
                
                logInfo(`✅ Sheet "${sheetName}" analyzed successfully`, 'showSheetSelector', info);
                
            } catch (sheetError) {
                const errorInfo = {
                    sheetName: sheetName,
                    index: index,
                    error: sheetError.message,
                    availableKeys: workbook.Sheets ? Object.keys(workbook.Sheets) : 'No Sheets object',
                    worksheetType: workbook.Sheets && workbook.Sheets[sheetName] ? typeof workbook.Sheets[sheetName] : 'undefined'
                };
                
                sheetErrors.push(errorInfo);
                logError(sheetError, `showSheetSelector - Sheet Analysis (${sheetName})`, errorInfo);
            }
        });
        
        if (sheetErrors.length > 0) {
            logWarning(`${sheetErrors.length} sheets had analysis errors`, 'showSheetSelector', {
                errors: sheetErrors,
                successfulSheets: sheetInfo.length
            });
        }

        if (sheetInfo.length === 0) {
            throw new Error('No sheets could be analyzed successfully');
        }
        
        // Sort sheets by size (smallest first)
        sheetInfo.sort((a, b) => a.cellCount - b.cellCount);
        
        const selectorStats = {
            totalSheets: sheetInfo.length,
            errorSheets: sheetErrors.length,
            smallSheets: sheetInfo.filter(s => s.cellCount <= 10000).length,
            mediumSheets: sheetInfo.filter(s => s.cellCount > 10000 && s.cellCount <= 50000).length,
            largeSheets: sheetInfo.filter(s => s.cellCount > 50000).length,
            totalCells: sheetInfo.reduce((sum, s) => sum + s.cellCount, 0)
        };

        logInfo('Sheet selector statistics', 'showSheetSelector', selectorStats);
        
        // Create sheet selector HTML
        let selectorHTML = `
            <div class="sheet-selector-container">
                <h3>📋 Selecciona las hojas que deseas cargar</h3>
                <p class="file-info">
                    📁 <strong>${currentFile.name}</strong> 
                    (${(currentFile.size / 1024 / 1024).toFixed(1)}MB - ${sheetInfo.length} hojas disponibles - ${selectorStats.totalCells.toLocaleString()} celdas totales)
                    ${currentFile.name.split('.').pop().toLowerCase() === 'xls' ? '<br>📝 <small>Archivo XLS detectado - Compatibilidad limitada</small>' : ''}
                </p>
                
                ${sheetErrors.length > 0 ? `
                <div class="error-warning">
                    ⚠️ <strong>Advertencia:</strong> ${sheetErrors.length} hoja(s) no pudieron analizarse y no están disponibles.
                    <br><small>Consulta la consola del navegador para más detalles.</small>
                </div>
                ` : ''}
                
                <div class="selection-controls">
                    <button type="button" onclick="selectAllSheets()" class="control-btn">✅ Seleccionar Todas</button>
                    <button type="button" onclick="selectNoneSheets()" class="control-btn">❌ Deseleccionar Todas</button>
                    <button type="button" onclick="selectSmallSheets()" class="control-btn">🎯 Solo Hojas Pequeñas</button>
                </div>
                
                <div class="sheets-list">
        `;
        
        sheetInfo.forEach((sheet, index) => {
            const sizeClass = sheet.cellCount > 50000 ? 'large-sheet' : 
                             sheet.cellCount > 10000 ? 'medium-sheet' : 'small-sheet';
            const sizeIcon = sheet.cellCount > 50000 ? '🔴' : 
                            sheet.cellCount > 10000 ? '🟡' : '🟢';
            const isLarge = sheet.cellCount > 100000;
            
            // Escape HTML in sheet name to prevent XSS
            const escapedSheetName = sheet.name.replace(/[&<>"']/g, function (m) {
                return {
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#39;'
                }[m];
            });
            
            selectorHTML += `
                <div class="sheet-item ${sizeClass}">
                    <label class="sheet-label">
                        <input type="checkbox" 
                               class="sheet-checkbox" 
                               value="${sheet.index}" 
                               data-name="${escapedSheetName}"
                               data-size="${sheet.cellCount}"
                               ${index < 3 && !isLarge ? 'checked' : ''}>
                        <div class="sheet-info">
                            <div class="sheet-name">
                                ${sizeIcon} <strong>${escapedSheetName}</strong>
                                ${isLarge ? '<span class="warning-badge">⚠️ MUY GRANDE</span>' : ''}
                            </div>
                            <div class="sheet-details">
                                ${sheet.range} 
                                ${sheet.cellCount > 0 ? `(~${sheet.cellCount.toLocaleString()} celdas)` : ''}
                                ${isLarge ? ' - ¡Puede consumir mucha memoria!' : ''}
                            </div>
                        </div>
                    </label>
                </div>
            `;
        });
        
        selectorHTML += `
                </div>
                
                <div class="load-controls">
                    <div class="memory-warning">
                        💡 <strong>Recomendación:</strong> Selecciona solo las hojas que necesites para optimizar el rendimiento.
                        <br>🟢 Pequeña (&lt;10k celdas) | 🟡 Mediana (10k-50k) | 🔴 Grande (&gt;50k celdas)
                        <br>📊 <strong>Estadísticas:</strong> ${selectorStats.smallSheets} pequeñas, ${selectorStats.mediumSheets} medianas, ${selectorStats.largeSheets} grandes
                        ${currentFile.name.split('.').pop().toLowerCase() === 'xls' ? '<br>📝 <em>Para mejor compatibilidad, considera convertir a .xlsx</em>' : ''}
                    </div>
                </div>
            </div>
        `;
        
        sheetSelector.innerHTML = selectorHTML;
        sheetSelector.style.display = 'block';
        loadSelectedButton.style.display = 'inline-block';
        resetButton.style.display = 'inline-block';
        
        logInfo('✅ Sheet selector displayed successfully', 'showSheetSelector', selectorStats);
        
    } catch (error) {
        logError(error, 'showSheetSelector', {
            workbookExists: !!workbook,
            sheetNamesCount: workbook.SheetNames ? workbook.SheetNames.length : 'N/A',
            fileName: currentFile ? currentFile.name : 'N/A'
        });
        alert('Error al crear el selector de hojas. Consulta la consola para más detalles.');
        loading.style.display = 'none';
    }
}

// Sheet selection helper functions with error handling
function selectAllSheets() {
    try {
        const checkboxes = document.querySelectorAll('.sheet-checkbox');
        checkboxes.forEach(cb => cb.checked = true);
        logInfo(`Selected all sheets (${checkboxes.length})`, 'selectAllSheets');
    } catch (error) {
        logError(error, 'selectAllSheets');
    }
}

function selectNoneSheets() {
    try {
        const checkboxes = document.querySelectorAll('.sheet-checkbox');
        checkboxes.forEach(cb => cb.checked = false);
        logInfo(`Deselected all sheets (${checkboxes.length})`, 'selectNoneSheets');
    } catch (error) {
        logError(error, 'selectNoneSheets');
    }
}

function selectSmallSheets() {
    try {
        const checkboxes = document.querySelectorAll('.sheet-checkbox');
        let selectedCount = 0;
        checkboxes.forEach(cb => {
            const size = parseInt(cb.dataset.size);
            cb.checked = size <= 10000;
            if (cb.checked) selectedCount++;
        });
        logInfo(`Selected ${selectedCount} small sheets (≤10k cells)`, 'selectSmallSheets');
    } catch (error) {
        logError(error, 'selectSmallSheets');
    }
}

// Enhanced load selected sheets button event
loadSelectedButton.addEventListener('click', function() {
    try {
        const selectedCheckboxes = document.querySelectorAll('.sheet-checkbox:checked');
        
        if (selectedCheckboxes.length === 0) {
            logWarning('No sheets selected for loading', 'loadSelectedButton');
            alert('Por favor selecciona al menos una hoja para cargar.');
            return;
        }
        
        const selectedSheets = Array.from(selectedCheckboxes).map(cb => ({
            index: parseInt(cb.value),
            name: cb.dataset.name,
            size: parseInt(cb.dataset.size)
        }));
        
        const selectionStats = {
            selectedCount: selectedSheets.length,
            totalCells: selectedSheets.reduce((sum, sheet) => sum + sheet.size, 0),
            largestSheet: Math.max(...selectedSheets.map(s => s.size)),
            smallestSheet: Math.min(...selectedSheets.map(s => s.size)),
            sheetNames: selectedSheets.map(s => s.name)
        };
        
        logInfo('Loading selected sheets', 'loadSelectedButton', selectionStats);
        
        // Warning for large selections
        if (selectionStats.totalCells > 200000) {
            logWarning('Large selection detected, showing user warning', 'loadSelectedButton', selectionStats);
            
            const proceed = confirm(`Has seleccionado muchas celdas (${selectionStats.totalCells.toLocaleString()}).
            
    Esto puede:
    • Tomar varios minutos en cargar
    • Consumir mucha memoria (>2GB RAM)
    • Hacer que el navegador se vuelva lento

    ¿Continuar de todos modos?`);
            
            if (!proceed) {
                logInfo('User cancelled large selection processing', 'loadSelectedButton');
                return;
            }
        }
        
        // Hide selector and show loading
        sheetSelector.style.display = 'none';
        loadSelectedButton.style.display = 'none';
        
        showEnhancedLoading(`Cargando ${selectedSheets.length} hojas seleccionadas...`);
        
        // Load selected sheets
        setTimeout(() => {
            loadSelectedSheets(selectedSheets);
        }, 200);
        
    } catch (error) {
        logError(error, 'loadSelectedButton', {
            checkboxesFound: document.querySelectorAll('.sheet-checkbox').length,
            selectedFound: document.querySelectorAll('.sheet-checkbox:checked').length
        });
        alert('Error al procesar la selección de hojas. Consulta la consola para más detalles.');
    }
});

// Enhanced loading display
function showEnhancedLoading(message = 'Procesando...') {
    try {
        loading.innerHTML = `
            <div style="text-align: center;">
                <h3>🔄 ${message}</h3>
                <p>Esto puede tomar varios minutos según el tamaño de las hojas.</p>
                <div id="progress-container">
                    <div id="progress-bar" style="width:100%;background:#f0f0f0;border-radius:5px;margin:10px 0;">
                        <div id="progress-fill" style="width:0%;height:25px;background:linear-gradient(45deg, #007bff, #0056b3);border-radius:5px;transition:width 0.3s;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;"></div>
                    </div>
                    <div id="progress-text">Iniciando...</div>
                </div>
            </div>
        `;
        loading.style.display = 'block';
        logInfo('Enhanced loading display shown', 'showEnhancedLoading', { message });
    } catch (error) {
        logError(error, 'showEnhancedLoading');
    }
}

// Update progress
function updateProgress(percentage, text) {
    try {
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        
        if (progressFill) {
            progressFill.style.width = percentage + '%';
            progressFill.textContent = Math.round(percentage) + '%';
        }
        
        if (progressText) {
            progressText.textContent = text;
        }
        
        logInfo(`Progress: ${percentage}% - ${text}`, 'updateProgress');
    } catch (error) {
        logError(error, 'updateProgress', { percentage, text });
    }
}

// Load only selected sheets
function loadSelectedSheets(selectedSheets) {
    try {
        logInfo('Starting to load selected sheets', 'loadSelectedSheets', {
            sheetsCount: selectedSheets.length,
            sheetNames: selectedSheets.map(s => s.name)
        });
        
        updateProgress(10, 'Preparando hojas seleccionadas...');
        
        // Re-read file with full data only for selected sheets
        const reader = new FileReader();
        
        reader.onerror = function(e) {
            logError(new Error('FileReader failed during full read'), 'loadSelectedSheets - FileReader', {
                error: e,
                selectedSheets: selectedSheets.map(s => s.name)
            });
            alert('Error al leer el archivo para cargar las hojas. Consulta la consola para más detalles.');
            loading.style.display = 'none';
        };
        
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                
                updateProgress(30, 'Procesando archivo completo...');
                
                // Read with full data - use appropriate strategy based on file type
                const fileExtension = currentFile.name.split('.').pop().toLowerCase();
                let readOptions;
                
                if (fileExtension === 'xls') {
                    readOptions = {
                        type: 'array',
                        cellStyles: currentFile.size < 30 * 1024 * 1024,
                        cellNF: false,
                        cellHTML: false,
                        cellDates: true,
                        bookVBA: false,
                        sheetStubs: false,
                        dense: true
                    };
                } else {
                    readOptions = {
                        type: 'array',
                        cellStyles: currentFile.size < 30 * 1024 * 1024,
                        cellNF: false,
                        cellHTML: false,
                        cellDates: true,
                        bookVBA: false,
                        sheetStubs: false,
                        dense: true
                    };
                }
                
                const fullWorkbook = XLSX.read(data, readOptions);
                
                updateProgress(50, 'Convirtiendo hojas seleccionadas...');
                
                // Convert only selected sheets
                const luckysheetData = convertSelectedSheets(fullWorkbook, selectedSheets);
                
                updateProgress(90, 'Inicializando visor...');
                
                // Initialize Luckysheet
                setTimeout(() => {
                    initializeLuckysheet(luckysheetData);
                }, 100);
                
            } catch (error) {
                logError(error, 'loadSelectedSheets - Processing', {
                    dataLength: e.target.result ? e.target.result.byteLength : 'N/A',
                    selectedSheets: selectedSheets.map(s => s.name)
                });
                alert('Error al procesar las hojas seleccionadas. Consulta la consola para más detalles.');
                loading.style.display = 'none';
            }
        };
        
        reader.readAsArrayBuffer(currentFile);
        
    } catch (error) {
        logError(error, 'loadSelectedSheets', {
            selectedSheets: selectedSheets.map(s => s.name)
        });
        alert('Error al iniciar la carga de hojas seleccionadas. Consulta la consola para más detalles.');
        loading.style.display = 'none';
    }
}

// Convert only selected sheets
function convertSelectedSheets(workbook, selectedSheets) {
    const sheets = [];
    
    selectedSheets.forEach((selectedSheet, arrayIndex) => {
        try {
            const sheetName = workbook.SheetNames[selectedSheet.index];
            updateProgress(60 + (arrayIndex / selectedSheets.length) * 25, `Procesando: ${sheetName}`);
            
            logInfo(`🔄 Procesando hoja seleccionada: ${sheetName}`, 'convertSelectedSheets');
            
            const worksheet = workbook.Sheets[sheetName];
            
            if (!worksheet) {
                logWarning(`⚠️ Hoja no encontrada: ${sheetName}`, 'convertSelectedSheets');
                return;
            }
            
            // Handle sheets without !ref (common in XLS files)
            let range;
            if (worksheet['!ref']) {
                range = XLSX.utils.decode_range(worksheet['!ref']);
            } else {
                // Try to determine range from available cells
                const cellKeys = Object.keys(worksheet).filter(key => key[0] !== '!');
                if (cellKeys.length > 0) {
                    // Find min/max rows and cols
                    let minR = Infinity, maxR = -1, minC = Infinity, maxC = -1;
                    cellKeys.forEach(cellAddress => {
                        try {
                            const cellRef = XLSX.utils.decode_cell(cellAddress);
                            minR = Math.min(minR, cellRef.r);
                            maxR = Math.max(maxR, cellRef.r);
                            minC = Math.min(minC, cellRef.c);
                            maxC = Math.max(maxC, cellRef.c);
                        } catch (e) {
                            // Skip invalid cell addresses
                        }
                    });
                    
                    if (minR !== Infinity) {
                        range = { s: { r: minR, c: minC }, e: { r: maxR, c: maxC } };
                    } else {
                        range = { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } };
                    }
                } else {
                    range = { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } };
                }
            }
            
            const celldata = [];
            
            // Process cells efficiently
            const cellAddresses = Object.keys(worksheet).filter(key => 
                key.charAt(0) !== '!' && worksheet[key] && worksheet[key].v !== undefined
            );
            
            cellAddresses.forEach(cellAddress => {
                try {
                    const cellRef = XLSX.utils.decode_cell(cellAddress);
                    const cell = worksheet[cellAddress];
                    
                    if (!cell || cell.v === undefined) return;
                    
                    const cellInfo = {
                        r: cellRef.r,
                        c: cellRef.c,
                        v: {
                            v: cell.v,
                            ct: { fa: 'General', t: 'g' },
                            m: cell.w || String(cell.v || ''),
                            bg: null,
                            fc: null,
                            fs: 11,
                            ff: 'Arial',
                            bl: 0,
                            it: 0,
                            ul: 0,
                            cl: 0
                        }
                    };
                    
                    // Apply styles if available and file is not too large
                    if (cell.s && currentFile.size < 40 * 1024 * 1024) {
                        applyBasicStyles(cellInfo.v, cell.s);
                    }
                    
                    celldata.push(cellInfo);
                } catch (cellError) {
                    logWarning(`Error procesando celda ${cellAddress}`, 'convertSelectedSheets', {
                        error: cellError.message,
                        cellAddress
                    });
                }
            });
            
            logInfo(`✅ Hoja ${sheetName}: ${celldata.length} celdas procesadas`, 'convertSelectedSheets');
            
            sheets.push({
                name: sheetName,
                color: '',
                index: arrayIndex,
                status: arrayIndex === 0 ? 1 : 0,
                order: arrayIndex,
                hide: 0,
                row: range.e.r + 1,
                column: range.e.c + 1,
                defaultRowHeight: 19,
                defaultColWidth: 73,
                celldata: celldata,
                config: {},
                scrollLeft: 0,
                scrollTop: 0,
                luckysheet_select_save: [],
                calcChain: [],
                isPivotTable: false,
                pivotTable: {},
                filter_select: {},
                filter: null,
                luckysheet_alternateformat_save: [],
                luckysheet_alternateformat_save_modelCustom: [],
                luckysheet_conditionformat_save: {},
                frozen: {},
                chart: [],
                zoomRatio: 1,
                image: [],
                showGridLines: 1,
                dataVerification: {}
            });
            
        } catch (sheetError) {
            logError(sheetError, `convertSelectedSheets - Sheet ${selectedSheet.name}`, {
                sheetIndex: selectedSheet.index,
                arrayIndex: arrayIndex
            });
        }
    });
    
    return sheets;
}

// Apply basic styles efficiently (same as before)
function applyBasicStyles(cellValue, style) {
    try {
        if (!style) return;
        
        if (style.fill && style.fill.bgColor) {
            cellValue.bg = convertColorOptimized(style.fill.bgColor);
        }
        
        if (style.font) {
            if (style.font.color) {
                cellValue.fc = convertColorOptimized(style.font.color);
            }
            if (style.font.bold) cellValue.bl = 1;
            if (style.font.italic) cellValue.it = 1;
            if (style.font.underline) cellValue.ul = 1;
            if (style.font.sz && style.font.sz > 0) cellValue.fs = Math.min(style.font.sz, 72);
            if (style.font.name) cellValue.ff = style.font.name;
        }
    } catch (error) {
        logWarning('Error applying basic styles', 'applyBasicStyles', {
            error: error.message
        });
    }
}

// Optimized color conversion (same as before)
function convertColorOptimized(color) {
    try {
        if (!color) return null;
        
        if (color.rgb) {
            return '#' + color.rgb.substring(0, 6);
        }
        
        const basicColors = {
            0: '#000000', 1: '#FFFFFF', 2: '#FF0000', 3: '#00FF00', 4: '#0000FF',
            5: '#FFFF00', 6: '#FF00FF', 7: '#00FFFF', 8: '#000000', 9: '#FFFFFF',
            10: '#FF0000', 11: '#00FF00', 12: '#0000FF', 13: '#FFFF00', 14: '#FF00FF', 15: '#00FFFF'
        };
        
        if (color.indexed !== undefined && basicColors[color.indexed]) {
            return basicColors[color.indexed];
        }
        
        return null;
    } catch (error) {
        logWarning('Error converting color', 'convertColorOptimized', {
            error: error.message,
            color: color
        });
        return null;
    }
}

// Initialize Luckysheet (simplified version)
function initializeLuckysheet(sheets) {
    try {
        logInfo('🔄 Inicializando Luckysheet con', 'initializeLuckysheet', {
            sheetsCount: sheets.length,
            totalCells: sheets.reduce((sum, sheet) => sum + sheet.celldata.length, 0)
        });
        
        if (luckysheetsInstance) {
            luckysheet.destroy();
        }
        
        loading.style.display = 'none';
        body.classList.add('showing-spreadsheet');
        
        luckysheet.create({
            container: 'luckysheet',
            title: `${currentFile.name} - ${sheets.length} hojas`,
            lang: 'es',
            data: sheets,
            showtoolbar: true,
            showinfobar: false,
            showsheetbar: sheets.length > 1,
            showstatisticBar: false,
            allowCopy: true,
            allowEdit: false,
            showConfigWindowResize: false,
            enableAddRow: false,
            enableAddCol: false,
            hook: {
                updated: function () {
                    logInfo('✅ Luckysheet cargado correctamente', 'initializeLuckysheet');
                    updateProgress(100, '¡Completado!');
                    setTimeout(() => {
                        printButton.style.display = 'inline-block';
                        resetButton.style.display = 'inline-block';
                    }, 500);
                }
            }
        });
        
        luckysheetsInstance = true;
        
    } catch (error) {
        logError(error, 'initializeLuckysheet', {
            sheetsCount: sheets.length
        });
        alert('Error al mostrar las hojas. Intenta seleccionar menos hojas.');
        loading.style.display = 'none';
        body.classList.remove('showing-spreadsheet');
    }
}

// Paper size change event
paperSizeSelect.addEventListener('change', function() {
    try {
        const selectedSize = paperSizeSelect.value;
        body.className = body.className.replace(/letter|tabloid/g, '') + ' ' + selectedSize;
        logInfo(`Paper size changed to: ${selectedSize}`, 'paperSizeSelect');
    } catch (error) {
        logError(error, 'paperSizeSelect');
    }
});

// Print button event
printButton.addEventListener('click', function() {
    try {
        logInfo('Print button clicked', 'printButton');
        
        const toolbars = document.querySelectorAll('.luckysheet-wa-editor, .luckysheet-sheettab-container, .luckysheet-info-detail');
        toolbars.forEach(el => el.style.display = 'none');
        
        setTimeout(() => {
            window.print();
            setTimeout(() => {
                toolbars.forEach(el => el.style.display = '');
                logInfo('Print completed, toolbars restored', 'printButton');
            }, 1000);
        }, 100);
    } catch (error) {
        logError(error, 'printButton');
        alert('Error al imprimir. Consulta la consola para más detalles.');
    }
});

// Reset button event
resetButton.addEventListener('click', function() {
    try {
        logInfo('Reset button clicked', 'resetButton');
        
        if (luckysheetsInstance) {
            try {
                luckysheet.destroy();
                logInfo('Luckysheet instance destroyed', 'resetButton');
            } catch (destroyError) {
                logWarning('Error destroying Luckysheet instance', 'resetButton', {
                    error: destroyError.message
                });
            }
            luckysheetsInstance = null;
        }
        
        body.classList.remove('showing-spreadsheet');
        printButton.style.display = 'none';
        resetButton.style.display = 'none';
        loadSelectedButton.style.display = 'none';
        fileInput.value = '';
        loading.style.display = 'none';
        sheetSelector.style.display = 'none';
        currentFile = null;
        currentWorkbook = null;
        
        if (window.gc) {
            window.gc();
            logInfo('Garbage collection forced', 'resetButton');
        }
        
        logInfo('✅ Reset completed successfully', 'resetButton');
        
    } catch (error) {
        logError(error, 'resetButton');
        alert('Error al resetear la aplicación. Recarga la página si es necesario.');
    }
});

// Global error handlers
window.addEventListener('error', function(e) {
    logError(e.error || new Error(e.message), 'Global Error Handler', {
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno
    });
});

window.addEventListener('unhandledrejection', function(e) {
    logError(e.reason || new Error('Unhandled Promise Rejection'), 'Unhandled Promise Rejection');
});

logInfo('Enhanced error handling system initialized with XLS support', 'Global Initialization');