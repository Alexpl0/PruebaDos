/**
 * Premium Freight - Utility Functions
 * Common utilities used across modules
 */

/**
 * Calculate ISO 8601 week number from a date string
 * @param {string} dateString - Date in string format
 * @returns {string|number} Week number or 'N/A' if invalid
 */
export function getWeekNumber(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return 'N/A';
        }
        const dayNum = date.getDay() || 7;
        date.setDate(date.getDate() + 4 - dayNum);
        const yearStart = new Date(date.getFullYear(), 0, 1);
        const weekNum = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
        return weekNum;
    } catch (e) {
        console.error("Error calculating week number for:", dateString, e);
        return 'N/A';
    }
}

/**
 * Shows a loading indicator with SweetAlert
 * @param {string} title - Title of the loading indicator
 * @param {string} text - Descriptive text
 * @param {number} [timer] - Optional auto-close timer in ms
 */
export function showLoading(title = 'Loading', text = 'Please wait...', timer = null) {
    const options = {
        title,
        text,
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); },
        customClass: { container: 'swal-on-top' }
    };
    
    if (timer) {
        options.timer = timer;
        options.timerProgressBar = true;
    }
    
    return Swal.fire(options);
}

/**
 * Add notification badge styles to document
 */
export function addNotificationStyles() {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        .file-status-badge {
            position: absolute;
            top: -10px;
            right: -10px;
            width: 28px;
            height: 28px;
            color: white;
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
            z-index: 10;
            font-size: 14px;
        }

        .file-status-badge.status-warning {
            background-color: #ffc107; /* Bootstrap Warning Yellow */
            cursor: pointer;
        }

        .file-status-badge.status-complete {
            background-color: #28a745; /* Bootstrap Success Green */
            cursor: default;
        }

        .file-status-badge i {
            line-height: 1; /* Helps center Font Awesome icons */
        }
    `;
    document.head.appendChild(styleElement);
}
