/**
 * Corrective Action Plan Management
 * Handles display and interactions for corrective action plans
 */

class CorrectiveActionPlan {
    constructor(orderId, userPermissions) {
        this.orderId = orderId;
        this.userPermissions = userPermissions;
        this.planData = null;
        this.files = [];
        this.init();
    }

    init() {
        this.loadPlanData();
        this.setupEventListeners();
    }

    async loadPlanData() {
        try {
            const response = await fetch(`${window.PF_CONFIG.app.baseURL}dao/conections/daoPremiumFreight.php`);
            const data = await response.json();
            
            if (data.status === 'success') {
                const order = data.data.find(order => order.id == this.orderId);
                if (order && order.corrective_action_plan) {
                    this.planData = order.corrective_action_plan;
                    await this.loadFiles();
                    this.renderPlan();
                } else {
                    this.renderNoPlan();
                }
            }
        } catch (error) {
            console.error('Error loading corrective action plan:', error);
            this.renderError();
        }
    }

    async loadFiles() {
        if (!this.planData?.cap_id) return;
        
        try {
            const response = await fetch(`${window.PF_CONFIG.app.baseURL}dao/conections/daoCorrectiveFiles.php?cap_id=${this.planData.cap_id}`);
            const data = await response.json();
            
            if (data.success) {
                this.files = data.files || [];
            }
        } catch (error) {
            console.error('Error loading files:', error);
        }
    }

    renderPlan() {
        const container = document.getElementById('correctiveActionContainer');
        if (!container) return;

        const statusClass = this.getStatusClass(this.planData.status);
        const statusBadge = this.renderStatusBadge(this.planData.status);

        container.innerHTML = `
            <div class="corrective-action-section">
                <div class="corrective-action-header">
                    <h3 class="corrective-action-title">
                        <i class="fas fa-clipboard-check"></i>
                        Corrective Action Plan
                    </h3>
                    ${statusBadge}
                </div>
                <div class="corrective-action-content">
                    <table class="plan-table">
                        <thead>
                            <tr>
                                <th>Corrective Action</th>
                                <th>Responsible</th>
                                <th>Target Date</th>
                                <th>Status</th>
                                <th>Comments</th>
                                <th>Files</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                    <div class="plan-description">
                                        ${this.escapeHtml(this.planData.corrective_action)}
                                    </div>
                                </td>
                                <td>
                                    <strong>${this.escapeHtml(this.planData.person_responsible)}</strong>
                                </td>
                                <td>
                                    <div class="target-date">
                                        <i class="fas fa-calendar-alt"></i>
                                        ${this.formatDate(this.planData.due_date)}
                                        <div class="week-info">
                                            ${this.getWeekInfo(this.planData.due_date)}
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    ${this.renderStatusControl()}
                                </td>
                                <td>
                                    ${this.renderCommentsControl()}
                                </td>
                                <td>
                                    ${this.renderFilesControl()}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    ${this.renderFileUploadSection()}
                </div>
            </div>
        `;

        this.attachTableEventListeners();
    }

    renderNoPlan() {
        const container = document.getElementById('correctiveActionContainer');
        if (!container) return;

        container.innerHTML = `
            <div class="corrective-action-section">
                <div class="corrective-action-header">
                    <h3 class="corrective-action-title">
                        <i class="fas fa-clipboard-check"></i>
                        Corrective Action Plan
                    </h3>
                </div>
                <div class="corrective-action-content">
                    <div class="no-plan-message">
                        <i class="fas fa-info-circle" style="font-size: 2rem; color: var(--gray-400); margin-bottom: 1rem;"></i>
                        <p>No corrective action plan has been created for this order.</p>
                    </div>
                </div>
            </div>
        `;
    }

    renderError() {
        const container = document.getElementById('correctiveActionContainer');
        if (!container) return;

        container.innerHTML = `
            <div class="corrective-action-section">
                <div class="corrective-action-content">
                    <div class="corrective-error">
                        <i class="fas fa-exclamation-triangle"></i>
                        Error loading corrective action plan. Please try again later.
                    </div>
                </div>
            </div>
        `;
    }

    renderStatusControl() {
        const canUpdateStatus = this.userPermissions.canUpdateStatus;
        const statusOptions = ['On Track', 'At Risk', 'Delayed'];
        
        if (canUpdateStatus) {
            const options = statusOptions.map(status => 
                `<option value="${status}" ${status === this.planData.status ? 'selected' : ''}>${status}</option>`
            ).join('');
            
            return `
                <select id="statusSelect" class="corrective-form-control corrective-select">
                    ${options}
                </select>
                <button id="updateStatusBtn" class="corrective-btn btn-primary-corrective" style="margin-top: 0.5rem; font-size: 0.75rem;">
                    <i class="fas fa-save"></i> Update
                </button>
            `;
        } else {
            return `
                <span class="corrective-badge status-${this.getStatusClass(this.planData.status)}">
                    ${this.planData.status}
                </span>
            `;
        }
    }

    renderCommentsControl() {
        const canEditComments = this.userPermissions.canEditComments;
        const comments = this.planData.comments || '';
        
        if (canEditComments) {
            return `
                <textarea id="commentsTextarea" class="corrective-form-control corrective-textarea" 
                    placeholder="Add your comments about the progress...">${this.escapeHtml(comments)}</textarea>
                <button id="updateCommentsBtn" class="corrective-btn btn-success-corrective" style="margin-top: 0.5rem; font-size: 0.75rem;">
                    <i class="fas fa-save"></i> Save Comments
                </button>
            `;
        } else {
            return `
                <div class="readonly-comments">
                    ${comments ? this.escapeHtml(comments) : '<em>No comments yet</em>'}
                </div>
                <div class="permission-note">Read-only</div>
            `;
        }
    }

    renderFilesControl() {
        const fileCount = this.files.length;
        const canUpload = this.userPermissions.canUploadFiles;
        
        return `
            <div class="files-summary">
                <i class="fas fa-paperclip"></i>
                ${fileCount} file${fileCount !== 1 ? 's' : ''}
                ${fileCount > 0 ? `<button class="corrective-btn btn-secondary-corrective" onclick="correctivePlan.showFiles()" style="margin-left: 0.5rem; font-size: 0.75rem;"><i class="fas fa-eye"></i> View</button>` : ''}
            </div>
            ${canUpload ? '<div class="permission-note">You can upload evidence files below</div>' : '<div class="permission-note">File upload restricted</div>'}
        `;
    }

    renderFileUploadSection() {
        if (!this.userPermissions.canUploadFiles) return '';

        return `
            <div class="file-upload-section">
                <div class="file-upload-header">
                    <h4 class="file-upload-title">
                        <i class="fas fa-cloud-upload-alt"></i>
                        Upload Evidence Files
                    </h4>
                </div>
                <div class="file-input-wrapper">
                    <input type="file" id="evidenceFileInput" class="file-input-hidden" 
                        accept=".pdf,.jpg,.jpeg,.png,.gif" multiple>
                    <button class="file-input-button" onclick="document.getElementById('evidenceFileInput').click()">
                        <i class="fas fa-plus"></i>
                        Choose Files
                    </button>
                </div>
                <div class="permission-note">
                    Accepted formats: PDF, JPG, PNG, GIF. Maximum 5MB per file.
                </div>
                <div id="filesList" class="file-list">
                    ${this.renderFilesList()}
                </div>
            </div>
        `;
    }

    renderFilesList() {
        if (this.files.length === 0) {
            return '<p style="color: var(--gray-600); font-style: italic; margin-top: 1rem;">No files uploaded yet.</p>';
        }

        return this.files.map(file => `
            <div class="file-item">
                <div class="file-info">
                    <div class="file-icon ${file.file_type === 'pdf' ? 'file-icon-pdf' : 'file-icon-image'}">
                        ${file.file_type === 'pdf' ? 'PDF' : 'IMG'}
                    </div>
                    <div class="file-details">
                        <p class="file-name">${this.escapeHtml(file.file_name)}</p>
                        <p class="file-meta">Uploaded ${this.formatDate(file.upload_date)}</p>
                    </div>
                </div>
                <div class="file-actions">
                    <button class="file-action-btn btn-view" onclick="correctivePlan.viewFile(${file.file_id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="file-action-btn btn-download" onclick="correctivePlan.downloadFile(${file.file_id})">
                        <i class="fas fa-download"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    renderStatusBadge(status) {
        const statusClass = this.getStatusClass(status);
        return `<span class="corrective-action-badge status-${statusClass}">${status}</span>`;
    }

    getStatusClass(status) {
        switch (status) {
            case 'On Track': return 'on-track';
            case 'At Risk': return 'at-risk';
            case 'Delayed': return 'delayed';
            default: return 'on-track';
        }
    }

    setupEventListeners() {
        // File input change listener
        document.addEventListener('change', (e) => {
            if (e.target.id === 'evidenceFileInput') {
                this.handleFileUpload(e.target.files);
            }
        });
    }

    attachTableEventListeners() {
        // Status update listener
        const updateStatusBtn = document.getElementById('updateStatusBtn');
        if (updateStatusBtn) {
            updateStatusBtn.addEventListener('click', () => this.updateStatus());
        }

        // Comments update listener
        const updateCommentsBtn = document.getElementById('updateCommentsBtn');
        if (updateCommentsBtn) {
            updateCommentsBtn.addEventListener('click', () => this.updateComments());
        }
    }

    async updateStatus() {
        const statusSelect = document.getElementById('statusSelect');
        const newStatus = statusSelect.value;

        try {
            const response = await fetch(`${window.PF_CONFIG.app.baseURL}dao/conections/daoCorrectivePlan.php`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    cap_id: this.planData.cap_id,
                    status: newStatus
                })
            });

            const result = await response.json();

            if (result.success) {
                this.planData.status = newStatus;
                this.showSuccess('Status updated successfully');
                this.updateStatusBadge(newStatus);
            } else {
                this.showError(result.message || 'Failed to update status');
            }
        } catch (error) {
            console.error('Error updating status:', error);
            this.showError('Error updating status');
        }
    }

    async updateComments() {
        const commentsTextarea = document.getElementById('commentsTextarea');
        const comments = commentsTextarea.value.trim();

        try {
            const response = await fetch(`${window.PF_CONFIG.app.baseURL}dao/conections/daoCorrectivePlan.php`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    cap_id: this.planData.cap_id,
                    comments: comments
                })
            });

            const result = await response.json();

            if (result.success) {
                this.planData.comments = comments;
                this.showSuccess('Comments saved successfully');
            } else {
                this.showError(result.message || 'Failed to save comments');
            }
        } catch (error) {
            console.error('Error saving comments:', error);
            this.showError('Error saving comments');
        }
    }

    async handleFileUpload(files) {
        if (!files.length) return;

        for (const file of files) {
            if (!this.validateFile(file)) continue;

            const formData = new FormData();
            formData.append('evidenceFile', file);
            formData.append('cap_id', this.planData.cap_id);
            formData.append('uploaded_by', window.PF_CONFIG.user.id);

            try {
                const response = await fetch(`${window.PF_CONFIG.app.baseURL}dao/conections/daoUploadCorrectiveEvidence.php`, {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (result.success) {
                    await this.loadFiles();
                    this.updateFilesList();
                    this.showSuccess(`File "${file.name}" uploaded successfully`);
                } else {
                    this.showError(result.message || `Failed to upload ${file.name}`);
                }
            } catch (error) {
                console.error('Error uploading file:', error);
                this.showError(`Error uploading ${file.name}`);
            }
        }

        // Clear the file input
        document.getElementById('evidenceFileInput').value = '';
    }

    validateFile(file) {
        const maxSize = 5 * 1024 * 1024; // 5MB
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif'];

        if (file.size > maxSize) {
            this.showError(`File "${file.name}" is too large. Maximum size is 5MB.`);
            return false;
        }

        if (!allowedTypes.includes(file.type)) {
            this.showError(`File "${file.name}" has an invalid format. Only PDF and image files are allowed.`);
            return false;
        }

        return true;
    }

    updateFilesList() {
        const filesList = document.getElementById('filesList');
        if (filesList) {
            filesList.innerHTML = this.renderFilesList();
        }

        // Update file count in the table
        const filesCell = document.querySelector('.files-summary');
        if (filesCell) {
            filesCell.innerHTML = this.renderFilesControl().match(/<div class="files-summary">[\s\S]*?<\/div>/)[0];
        }
    }

    updateStatusBadge(newStatus) {
        const header = document.querySelector('.corrective-action-header');
        const badge = header.querySelector('.corrective-action-badge');
        if (badge) {
            badge.className = `corrective-action-badge status-${this.getStatusClass(newStatus)}`;
            badge.textContent = newStatus;
        }
    }

    showFiles() {
        if (this.files.length === 0) {
            Swal.fire({
                icon: 'info',
                title: 'No Files',
                text: 'No evidence files have been uploaded yet.'
            });
            return;
        }

        const fileList = this.files.map(file => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #eee;">
                <div>
                    <strong>${this.escapeHtml(file.file_name)}</strong><br>
                    <small>Uploaded ${this.formatDate(file.upload_date)}</small>
                </div>
                <div>
                    <button onclick="correctivePlan.viewFile(${file.file_id})" style="margin-right: 5px; padding: 5px 10px; background: var(--grammer-blue); color: white; border: none; border-radius: 3px;">View</button>
                    <button onclick="correctivePlan.downloadFile(${file.file_id})" style="padding: 5px 10px; background: var(--gray-600); color: white; border: none; border-radius: 3px;">Download</button>
                </div>
            </div>
        `).join('');

        Swal.fire({
            title: 'Evidence Files',
            html: fileList,
            width: '600px',
            showConfirmButton: false,
            showCloseButton: true
        });
    }

    viewFile(fileId) {
        window.open(`${window.PF_CONFIG.app.baseURL}dao/conections/daoViewCorrectiveFile.php?file_id=${fileId}`, '_blank');
    }

    downloadFile(fileId) {
        window.open(`${window.PF_CONFIG.app.baseURL}dao/conections/daoDownloadCorrectiveFile.php?file_id=${fileId}`, '_blank');
    }

    showSuccess(message) {
        Swal.fire({
            icon: 'success',
            title: 'Success',
            text: message,
            timer: 3000,
            showConfirmButton: false
        });
    }

    showError(message) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: message
        });
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    getWeekInfo(dateString) {
        const date = new Date(dateString);
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
        const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        return `Week ${weekNumber} of ${date.getFullYear()}`;
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text ? text.replace(/[&<>"']/g, (m) => map[m]) : '';
    }
}

// Global instance for access from HTML
let correctivePlan = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on a page that should show corrective action plans
    const orderId = window.PF_CONFIG?.orderId;
    if (!orderId) return;

    // Determine user permissions
    const userId = window.PF_CONFIG.user.id;
    const userPermissions = {
        canUpdateStatus: userId == 36, // Only user 36 can update status
        canEditComments: true, // Order creator can edit comments (will be refined based on order data)
        canUploadFiles: true // Administrative users can upload files (will be refined)
    };

    // Initialize the corrective action plan
    correctivePlan = new CorrectiveActionPlan(orderId, userPermissions);
});