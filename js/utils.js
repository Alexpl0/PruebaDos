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
        .notification-badge {
            position: absolute;
            top: -8px;
            right: -8px;
            width: 24px;
            height: 24px;
            background-color: #ff4444;
            color: white;
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
            cursor: pointer;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
            z-index: 10;
        }

        .exclamation-icon {
            font-style: normal;
            font-weight: bold;
            font-size: 14px;
        }
    `;
    document.head.appendChild(styleElement);
    console.log("Added notification badge styles dynamically");
}