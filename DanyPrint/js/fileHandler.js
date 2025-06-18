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
        const validTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            'application/vnd.ms-excel', // .xls
            'text/csv' // .csv
        ];
        
        if (!validTypes.includes(file.type)) {
            const extension = file.name.split('.').pop().toLowerCase();
            if (!['xlsx', 'xls', 'csv'].includes(extension)) {
                this.logger.error('Invalid file type', 'fileHandler', { 
                    fileName: file.name, 
                    fileType: file.type 
                });
                return false;
            }
        }
        
        // Check file size (max 50MB)
        const maxSize = 50 * 1024 * 1024;
        if (file.size > maxSize) {
            this.logger.error('File too large', 'fileHandler', { 
                fileName: file.name, 
                fileSize: file.size,
                maxSize: maxSize
            });
            return false;
        }
        
        return true;
    }
    
    reset() {
        this.logger.info('FileHandler reset called', 'fileHandler');
    }
};