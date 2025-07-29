/**
 * Utility functions for Weekly Performance Dashboard
 */

import { config } from '../config/weeklyConfig.js';

class UtilityService {
    /**
     * Formatea números para visualización
     */
    formatNumber(number, decimals = 0) {
        if (isNaN(number) || number === null || number === undefined) return '0';
        
        const num = parseFloat(number);
        if (num === 0) return '0';
        
        return num.toLocaleString(undefined, { 
            maximumFractionDigits: decimals,
            minimumFractionDigits: decimals > 0 ? decimals : 0
        });
    }

    /**
     * Formatea números de moneda
     */
    formatCurrency(amount, currency = '€', decimals = 2) {
        if (isNaN(amount) || amount === null || amount === undefined) return currency + '0';
        
        const formatted = this.formatNumber(amount, decimals);
        return currency + formatted;
    }

    /**
     * Verifica si un elemento es visible en el DOM
     */
    isElementVisible(el) {
        if (!el) return false;
        return el.offsetParent !== null && 
               el.style.display !== 'none' && 
               el.style.visibility !== 'hidden' &&
               el.offsetWidth > 0 && 
               el.offsetHeight > 0;
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
        } else if (minutes > 0) {
            return `${minutes}m`;
        } else {
            return `${seconds}s`;
        }
    }

    /**
     * Formatea duración en formato human-readable
     */
    formatDuration(duration) {
        if (!duration) return 'N/A';
        
        // Si ya es string formateado, retornarlo
        if (typeof duration === 'string' && duration.includes('h')) {
            return duration;
        }
        
        // Si es número (segundos), convertir
        if (typeof duration === 'number') {
            return this.formatTime(duration);
        }
        
        return duration;
    }

    /**
     * Convierte fecha a formato ISO
     */
    formatDateForAPI(date) {
        if (typeof date === 'string') return date;
        if (date && date.format) return date.format('YYYY-MM-DD HH:mm:ss');
        if (date instanceof Date) return date.toISOString().slice(0, 19).replace('T', ' ');
        return date;
    }

    /**
     * Formatea fecha para mostrar
     */
    formatDateForDisplay(date, format = 'MMM DD, YYYY') {
        if (!date) return 'N/A';
        
        if (typeof date === 'string') {
            const parsedDate = new Date(date);
            if (isNaN(parsedDate.getTime())) return date;
            date = parsedDate;
        }
        
        if (date instanceof Date) {
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        }
        
        return date;
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
     * Genera colores para gráficas basados en la configuración
     */
    generateColors(count) {
        const colors = [];
        const baseColors = config.colors.chartColors;
        
        for (let i = 0; i < count; i++) {
            colors.push(baseColors[i % baseColors.length]);
        }
        
        return colors;
    }

    /**
     * Obtiene color por categoría
     */
    getColorByCategory(category) {
        const categoryColors = {
            'pending': config.colors.status.pending,
            'approved': config.colors.status.approved,
            'rejected': config.colors.status.rejected,
            'in_progress': config.colors.status.inProgress,
            'excellent': config.colors.performance.excellent,
            'good': config.colors.performance.good,
            'average': config.colors.performance.average,
            'poor': config.colors.performance.poor
        };
        
        return categoryColors[category] || config.colors.primary;
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
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                return true;
            } else {
                // Fallback para navegadores más antiguos
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'absolute';
                textArea.style.left = '-999999px';
                document.body.appendChild(textArea);
                textArea.select();
                textArea.setSelectionRange(0, 99999);
                document.execCommand('copy');
                document.body.removeChild(textArea);
                return true;
            }
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
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Sanitiza texto para uso en nombres de archivo
     */
    sanitizeFilename(filename) {
        return filename
            .replace(/[^a-z0-9.-]/gi, '_')
            .replace(/_{2,}/g, '_')
            .replace(/^_|_$/g, '');
    }

    /**
     * Calcula porcentaje con validación
     */
    calculatePercentage(value, total, decimals = 1) {
        if (!total || total === 0 || isNaN(value) || isNaN(total)) return 0;
        const percentage = (value / total) * 100;
        return Math.round(percentage * Math.pow(10, decimals)) / Math.pow(10, decimals);
    }

    /**
     * Convierte bytes a formato legible
     */
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
    }

    /**
     * Trunca texto con elipsis
     */
    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength).trim() + '...';
    }

    /**
     * Capitaliza primera letra
     */
    capitalize(text) {
        if (!text || typeof text !== 'string') return '';
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    }

    /**
     * Convierte texto a title case
     */
    toTitleCase(text) {
        if (!text || typeof text !== 'string') return '';
        return text.replace(/\w\S*/g, (txt) => 
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    }

    /**
     * Genera ID único
     */
    generateUniqueId(prefix = 'id') {
        return prefix + '_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    }

    /**
     * Valida si un valor es numérico
     */
    isNumeric(value) {
        return !isNaN(parseFloat(value)) && isFinite(value);
    }

    /**
     * Obtiene el valor seguro de un objeto anidado
     */
    safeGet(obj, path, defaultValue = null) {
        const keys = path.split('.');
        let result = obj;
        
        for (const key of keys) {
            if (result === null || result === undefined || typeof result !== 'object') {
                return defaultValue;
            }
            result = result[key];
        }
        
        return result !== undefined ? result : defaultValue;
    }

    /**
     * Retraso con promesa
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Agrupa array por propiedad
     */
    groupBy(array, key) {
        return array.reduce((groups, item) => {
            const groupKey = item[key];
            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(item);
            return groups;
        }, {});
    }

    /**
     * Ordena array por múltiples criterios
     */
    sortBy(array, ...criteria) {
        return array.sort((a, b) => {
            for (const criterion of criteria) {
                let aVal, bVal, desc = false;
                
                if (typeof criterion === 'string') {
                    aVal = a[criterion];
                    bVal = b[criterion];
                } else if (typeof criterion === 'function') {
                    aVal = criterion(a);
                    bVal = criterion(b);
                } else if (criterion.key) {
                    aVal = a[criterion.key];
                    bVal = b[criterion.key];
                    desc = criterion.desc || false;
                }
                
                if (aVal < bVal) return desc ? 1 : -1;
                if (aVal > bVal) return desc ? -1 : 1;
            }
            return 0;
        });
    }

    /**
     * Clona objeto profundamente
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const cloned = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    cloned[key] = this.deepClone(obj[key]);
                }
            }
            return cloned;
        }
    }

    /**
     * Convierte query string a objeto
     */
    parseQueryString(queryString) {
        const params = {};
        const pairs = (queryString.startsWith('?') ? queryString.slice(1) : queryString).split('&');
        
        for (const pair of pairs) {
            const [key, value] = pair.split('=');
            if (key) {
                params[decodeURIComponent(key)] = decodeURIComponent(value || '');
            }
        }
        
        return params;
    }

    /**
     * Convierte objeto a query string
     */
    objectToQueryString(obj) {
        const params = [];
        for (const key in obj) {
            if (obj.hasOwnProperty(key) && obj[key] !== null && obj[key] !== undefined) {
                params.push(`${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}`);
            }
        }
        return params.join('&');
    }
}

export const utilityService = new UtilityService();