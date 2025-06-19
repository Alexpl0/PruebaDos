// Project: File handling utilities

window.MiImpresoraWeb = window.MiImpresoraWeb || {};

window.MiImpresoraWeb.FileHandler = class FileHandler {
    constructor() {
        this.logger = new window.MiImpresoraWeb.Logger();
        this.onFileSelected = null;
        this.logger.info('FileHandler initialized', 'fileHandler');
    }
    
    // Remove DOM manipulation from FileHandler - let UIController handle it
    handleFileChange(event) {
        const file = event.target.files[0];
        if (file) {
            this.logger.info(`File selected: ${file.name}`, 'fileHandler', {
                size: file.size,
                type: file.type,
                lastModified: new Date(file.lastModified)
            });
            
            if (this.onFileSelected) {
                this.logger.info('Calling onFileSelected callback', 'fileHandler');
                this.onFileSelected(file);
            } else {
                this.logger.error('onFileSelected callback not set!', 'fileHandler');
            }
        }
    }
    
    validateFile(file) {
        // Expanded list of supported file types
        const validTypes = [
            // Excel formats
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            'application/vnd.ms-excel.sheet.macroEnabled.12', // .xlsm
            'application/vnd.ms-excel.sheet.binary.macroEnabled.12', // .xlsb
            'application/vnd.openxmlformats-officedocument.spreadsheetml.template', // .xltx
            'application/vnd.ms-excel.template.macroEnabled.12', // .xltm
            'application/vnd.ms-excel.addin.macroEnabled.12', // .xlam
            'application/vnd.ms-excel', // .xls
            'application/vnd.ms-excel.template', // .xlt
            'application/vnd.ms-excel.addin', // .xla
            'application/vnd.ms-excel.workspace', // .xlw
            
            // Other formats
            'text/csv', // .csv
            'application/xml', // .xml
            'text/xml', // .xml
            'text/plain', // .txt, .prn
            'application/vnd.ms-excel.prn', // .prn
            'application/vnd.sun.xml.calc', // .slk
            'application/x-dif', // .dif
            'application/vnd.oasis.opendocument.spreadsheet', // .ods
            
            // Generic types that might be used
            'application/octet-stream', // Sometimes used for Excel files
            'application/x-msexcel'
        ];
        
        // Check MIME type first
        let isValidType = validTypes.includes(file.type);
        
        // If MIME type check fails, check file extension
        if (!isValidType) {
            const extension = file.name.split('.').pop().toLowerCase();
            const validExtensions = [
                'xlsx', 'xlsm', 'xlsb', 'xltx', 'xltm', 'xlam',
                'xls', 'xlt', 'xla', 'xlw',
                'csv', 'xml', 'prn', 'txt', 'slk', 'dif', 'ods'
            ];
            
            isValidType = validExtensions.includes(extension);
            
            if (isValidType) {
                this.logger.info('File validated by extension', 'fileHandler', { 
                    fileName: file.name, 
                    extension: extension,
                    mimeType: file.type 
                });
            }
        }
        
        if (!isValidType) {
            this.logger.error('Invalid file type', 'fileHandler', { 
                fileName: file.name, 
                fileType: file.type,
                extension: file.name.split('.').pop().toLowerCase()
            });
            return false;
        }
        
        // Check file size (max 100MB for larger files)
        const maxSize = 100 * 1024 * 1024;
        if (file.size > maxSize) {
            this.logger.error('File too large', 'fileHandler', { 
                fileName: file.name, 
                fileSize: file.size,
                maxSize: maxSize
            });
            return false;
        }
        
        this.logger.success('File validation passed', 'fileHandler', { 
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size
        });
        
        return true;
    }
    
    reset() {
        this.logger.info('FileHandler reset called', 'fileHandler');
    }
};