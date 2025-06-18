// Project: Excel file processing utilities

window.MiImpresoraWeb = window.MiImpresoraWeb || {};

window.MiImpresoraWeb.ExcelProcessor = class ExcelProcessor {
    constructor() {
        this.logger = new window.MiImpresoraWeb.Logger();
    }
    
    async analyzeExcelFile(file) {
        this.logger.info('Starting Excel file analysis', 'excelProcessor', { fileName: file.name });
        
        try {
            const arrayBuffer = await this.readFileAsArrayBuffer(file);
            
            // Try multiple strategies to read the file
            let workbook = null;
            const strategies = [
                () => XLSX.read(arrayBuffer, { type: 'array', cellDates: true, cellNF: false, cellText: false }),
                () => XLSX.read(arrayBuffer, { type: 'array', cellDates: true, cellStyles: true }),
                () => XLSX.read(arrayBuffer, { type: 'array', raw: true }),
                () => XLSX.read(arrayBuffer, { type: 'array' })
            ];
            
            for (let i = 0; i < strategies.length; i++) {
                try {
                    workbook = strategies[i]();
                    this.logger.success(`Excel file read successfully with strategy ${i + 1}`, 'excelProcessor');
                    break;
                } catch (strategyError) {
                    this.logger.warning(`Strategy ${i + 1} failed`, 'excelProcessor', { error: strategyError.message });
                    if (i === strategies.length - 1) {
                        throw strategyError;
                    }
                }
            }
            
            if (!workbook) {
                throw new Error('All reading strategies failed');
            }
            
            // Analyze sheets
            const sheetsInfo = this.analyzeSheets(workbook);
            
            return {
                workbook: workbook,
                sheetsInfo: sheetsInfo,
                fileName: file.name
            };
            
        } catch (error) {
            this.logger.error('Failed to analyze Excel file', 'excelProcessor', { 
                fileName: file.name, 
                error: error.message 
            });
            throw error;
        }
    }
    
    analyzeSheets(workbook) {
        const sheetsInfo = [];
        
        workbook.SheetNames.forEach((sheetName, index) => {
            try {
                const worksheet = workbook.Sheets[sheetName];
                const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
                const rowCount = range.e.r - range.s.r + 1;
                const colCount = range.e.c - range.s.c + 1;
                const cellCount = rowCount * colCount;
                
                // Estimate memory usage
                let memoryEstimate = 'low';
                if (cellCount > 10000) memoryEstimate = 'high';
                else if (cellCount > 5000) memoryEstimate = 'medium';
                
                sheetsInfo.push({
                    index: index,
                    name: sheetName,
                    rowCount: rowCount,
                    colCount: colCount,
                    cellCount: cellCount,
                    memoryEstimate: memoryEstimate,
                    hasData: cellCount > 1
                });
                
            } catch (error) {
                this.logger.warning(`Could not analyze sheet: ${sheetName}`, 'excelProcessor', { error: error.message });
                sheetsInfo.push({
                    index: index,
                    name: sheetName,
                    rowCount: 0,
                    colCount: 0,
                    cellCount: 0,
                    memoryEstimate: 'unknown',
                    hasData: false,
                    error: error.message
                });
            }
        });
        
        return sheetsInfo;
    }
    
    convertSheetsToLuckysheet(workbook, selectedSheets) {
        this.logger.info('Converting sheets to Luckysheet format', 'excelProcessor', { 
            totalSheets: workbook.SheetNames.length,
            selectedSheets: selectedSheets.length 
        });
        
        const luckysheetsData = [];
        
        selectedSheets.forEach((sheetInfo, index) => {
            try {
                const sheetName = sheetInfo.name;
                const worksheet = workbook.Sheets[sheetName];
                
                if (!worksheet) {
                    this.logger.warning(`Sheet not found: ${sheetName}`, 'excelProcessor');
                    return;
                }
                
                // Convert to Luckysheet format
                const luckysheetData = this.convertWorksheetToLuckysheet(worksheet, sheetName, index);
                luckysheetsData.push(luckysheetData);
                
                this.logger.success(`Sheet converted: ${sheetName}`, 'excelProcessor');
                
            } catch (error) {
                this.logger.error(`Failed to convert sheet: ${sheetInfo.name}`, 'excelProcessor', { error: error.message });
            }
        });
        
        return luckysheetsData;
    }
    
    convertWorksheetToLuckysheet(worksheet, sheetName, index) {
        // Get sheet range
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
        const rowCount = range.e.r + 1;
        const colCount = range.e.c + 1;
        
        // Initialize data array
        const data = [];
        for (let r = 0; r < rowCount; r++) {
            const row = [];
            for (let c = 0; c < colCount; c++) {
                const cellAddress = XLSX.utils.encode_cell({ r: r, c: c });
                const cell = worksheet[cellAddress];
                
                if (cell) {
                    row.push({
                        v: cell.v, // value
                        ct: { fa: 'General', t: 'g' }, // cell type
                        m: cell.w || cell.v // display value
                    });
                } else {
                    row.push(null);
                }
            }
            data.push(row);
        }
        
        return {
            name: sheetName,
            index: index.toString(),
            status: index === 0 ? 1 : 0, // first sheet active
            row: rowCount,
            column: colCount,
            celldata: this.convertDataToCelldata(data),
            config: {
                merge: {},
                rowlen: {},
                columnlen: {},
                rowhidden: {},
                colhidden: {},
                borderInfo: [],
                authority: {}
            },
            scrollLeft: 0,
            scrollTop: 0,
            luckysheet_select_save: [{ row: [0, 0], column: [0, 0] }],
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
        };
    }
    
    convertDataToCelldata(data) {
        const celldata = [];
        
        data.forEach((row, r) => {
            row.forEach((cell, c) => {
                if (cell && cell.v !== null && cell.v !== undefined && cell.v !== '') {
                    celldata.push({
                        r: r,
                        c: c,
                        v: cell
                    });
                }
            });
        });
        
        return celldata;
    }
    
    readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        });
    }
};