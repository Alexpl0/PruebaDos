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
 * Function to format text to sentence case
 * Capitalizes first letter of sentences and maintains proper nouns
 * @param {string} text - Text to format
 * @returns {string} Formatted text in sentence case
 */
export function formatToSentenceCase(text) {
    if (!text || typeof text !== 'string') return '';
    
    // Common proper nouns that should remain capitalized
    const properNouns = [
        'Grammer', 'BMW', 'Mercedes', 'Audi', 'Volkswagen', 'Ford', 'GM', 'General Motors',
        'Toyota', 'Honda', 'Nissan', 'Hyundai', 'Kia', 'Mazda', 'Subaru', 'Mitsubishi',
        'Chrysler', 'Jeep', 'Ram', 'Dodge', 'Cadillac', 'Buick', 'Chevrolet', 'GMC',
        'Lincoln', 'Mercury', 'Pontiac', 'Saturn', 'Hummer', 'Saab', 'Volvo', 'Jaguar',
        'Land Rover', 'Bentley', 'Rolls-Royce', 'Aston Martin', 'Lotus', 'McLaren',
        'Ferrari', 'Lamborghini', 'Maserati', 'Alfa Romeo', 'Fiat', 'Lancia', 'Peugeot',
        'Citroën', 'Renault', 'Dacia', 'Skoda', 'Seat', 'Cupra', 'Mexico', 'USA', 'US',
        'Canada', 'Germany', 'France', 'Italy', 'Spain', 'UK', 'China', 'Japan', 'Korea',
        'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
        'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
        'September', 'October', 'November', 'December', 'COVID', 'AI', 'IT', 'QA', 'QC',
        'API', 'URL', 'HTML', 'CSS', 'JavaScript', 'PHP', 'SQL', 'JSON', 'XML', 'HTTP',
        'HTTPS', 'FTP', 'PDF', 'ZIP', 'CSV', 'Excel', 'PowerPoint', 'Word', 'Microsoft',
        'Google', 'Apple', 'Amazon', 'Facebook', 'Meta', 'Twitter', 'LinkedIn', 'YouTube'
    ];
    
    // First, trim and clean the text
    let formattedText = text.trim();
    
    // Convert to lowercase first
    formattedText = formattedText.toLowerCase();
    
    // Restore proper nouns
    properNouns.forEach(noun => {
        const regex = new RegExp(`\\b${noun.toLowerCase()}\\b`, 'gi');
        formattedText = formattedText.replace(regex, noun);
    });
    
    // Capitalize first letter of sentences (after period, exclamation, question mark)
    formattedText = formattedText.replace(/(^|[.!?]\s+)([a-z])/g, (match, prefix, letter) => {
        return prefix + letter.toUpperCase();
    });
    
    // Capitalize after colon if it starts a new thought
    formattedText = formattedText.replace(/:\s+([a-z])/g, (match, letter) => {
        return ': ' + letter.toUpperCase();
    });
    
    // Capitalize first letter after line breaks
    formattedText = formattedText.replace(/(\n\s*)([a-z])/g, (match, prefix, letter) => {
        return prefix + letter.toUpperCase();
    });
    
    return formattedText;
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
            background-color: var(--danger); /* Changed to use the --danger variable */
            cursor: pointer;
        }

        .file-status-badge.status-complete {
            background-color: var(--success); /* Bootstrap Success Green */
            cursor: default;
        }

        .file-status-badge i {
            line-height: 1; /* Helps center Font Awesome icons */
        }
    `;
    document.head.appendChild(styleElement);
}

/**
 * Validate minimum character length for textarea fields
 * @param {HTMLElement} textarea - The textarea element to validate
 * @param {number} minLength - Minimum required character length
 * @returns {boolean} True if valid, false otherwise
 */
export function validateTextareaLength(textarea, minLength = 50) {
    if (!textarea || !textarea.value) return false;
    return textarea.value.trim().length >= minLength;
}

/**
 * Update character counter display for a textarea
 * @param {HTMLElement} textarea - The textarea element
 * @param {string} counterSelector - CSS selector for the counter element
 * @param {number} minLength - Minimum required character length
 */
export function updateCharacterCounter(textarea, counterSelector, minLength = 50) {
    const length = textarea.value.length;
    const counterElement = document.querySelector(counterSelector);
    if (!counterElement) return;

    const charCountElement = counterElement.querySelector('.char-count');
    const reqElement = counterElement.querySelector('span:first-child');
    
    if (charCountElement) {
        charCountElement.textContent = `${length}/${minLength}`;
    }
    
    if (reqElement) {
        if (length >= minLength) {
            reqElement.classList.replace('text-danger', 'text-success');
            reqElement.textContent = 'Minimum length met';
            textarea.classList.add('is-valid');
            textarea.classList.remove('is-invalid');
        } else {
            reqElement.classList.replace('text-success', 'text-danger');
            reqElement.textContent = `${minLength} characters required`;
            textarea.classList.add('is-invalid');
            textarea.classList.remove('is-valid');
        }
    }
}