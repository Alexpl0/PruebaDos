/**
 * Utility functions for Weekly Performance Dashboard
 */

class UtilityService {
    /**
     * Formatea números para visualización
     */
    formatNumber(number, decimals = 0) {
        if (isNaN(number)) return '0';
        return number.toLocaleString(undefined, { maximumFractionDigits: decimals });
    }

    /**
     * Verifica si un elemento es visible en el DOM
     */
    isElementVisible(el) {
        if (!el) return false;
        return el.offsetParent !== null && el.style.display !== 'none';
    }

    /**
     * Formatea tiempo en segundos a formato legible
     */
    formatTime(seconds) {
        if (!seconds || seconds <= 0) return 'N/A';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }

    /**
     * Convierte fecha a formato ISO
     */
    formatDateForAPI(date) {
        return date.format('YYYY-MM-DD HH:mm:ss');
    }

    /**
     * Debounce function para optimizar llamadas
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Genera colores para gráficas
     */
    generateColors(count) {
        const baseColors = [
            '#034C8C', '#4A90D9', '#002856', '#00A3E0', '#218621',
            '#F59E0B', '#E41A23', '#3B82F6', '#16a34a', '#f59e0b'
        ];
        
        const colors = [];
        for (let i = 0; i < count; i++) {
            colors.push(baseColors[i % baseColors.length]);
        }
        
        return colors;
    }

    /**
     * Crea gradientes para gráficas
     */
    createGradient(color1, color2) {
        return `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`;
    }

    /**
     * Valida URL
     */
    isValidURL(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Copia texto al portapapeles
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.error('Failed to copy text: ', err);
            return false;
        }
    }

    /**
     * Descarga archivo como blob
     */
    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Sanitiza texto para uso en nombres de archivo
     */
    sanitizeFilename(filename) {
        return filename.replace(/[^a-z0-9.-]/gi, '_');
    }

    /**
     * Calcula porcentaje con validación
     */
    calculatePercentage(value, total) {
        if (!total || total === 0) return 0;
        return Math.round((value / total) * 100 * 10) / 10; // Una decimal
    }

    /**
     * Convierte bytes a formato legible
     */
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
    }

    /**
     * Trunca texto con elipsis
     */
    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    /**
     * Capitaliza primera letra
     */
    capitalize(text) {
        if (!text) return '';
        return text.charAt(0).toUpperCase() + text.slice(1);
    }

    /**
     * Genera ID único
     */
    generateUniqueId() {
        return 'id_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    }
}

export const utilityService = new UtilityService();