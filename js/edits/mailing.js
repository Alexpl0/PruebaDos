/**
 * mailing.js - Email Notification Handler for Edit Orders
 * Manages all email-related operations for the edit order system
 * 
 * @author GRAMMER AG
 * @version 1.0
 */

const MAILER_BASE_URL = 'https://grammermx.com/Mailer/PFMailer/';

/**
 * Sends edit request notification to approval officer (user 36)
 */
export async function sendEditRequestNotification(orderId, reason) {
    try {
        const response = await fetch(
            `${MAILER_BASE_URL}PFmailEditOrder.php?action=request_edit`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    orderId: orderId,
                    reason: reason
                })
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Failed to send request');
        }

        return {
            success: true,
            message: 'Edit request notification sent to approval officer',
            tokenId: data.tokenId
        };

    } catch (error) {
        console.error('[mailing.js] Error sending edit request:', error);
        return {
            success: false,
            message: error.message
        };
    }
}

/**
 * Sends approval/release notification to requester with edit link
 */
export async function sendEditApprovalNotification(tokenId, releasedBy = 36) {
    try {
        const response = await fetch(
            `${MAILER_BASE_URL}PFmailEditOrder.php?action=release_for_edit`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tokenId: tokenId,
                    releasedBy: releasedBy
                })
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Failed to send approval');
        }

        return {
            success: true,
            message: 'Approval notification sent to requester'
        };

    } catch (error) {
        console.error('[mailing.js] Error sending approval notification:', error);
        return {
            success: false,
            message: error.message
        };
    }
}

/**
 * Sends update notification when edited order is submitted
 */
export async function sendEditSubmissionNotification(orderId, tokenId) {
    try {
        const response = await fetch(
            `${MAILER_BASE_URL}PFmailEditOrder.php?action=submit_edit`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: orderId,
                    tokenId: tokenId
                })
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Failed to submit update');
        }

        return {
            success: true,
            message: data.message || 'Update submitted successfully'
        };

    } catch (error) {
        console.error('[mailing.js] Error submitting update:', error);
        return {
            success: false,
            message: error.message
        };
    }
}

/**
 * Gets the status of email notifications for an order
 */
export async function getNotificationStatus(orderId) {
    try {
        const response = await fetch(
            `${window.PF_CONFIG.app.baseURL}dao/edits/daoEditTokens.php?action=get_audit_log&orderId=${orderId}`,
            {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            }
        );

        const data = await response.json();

        if (!data.success) {
            return {
                success: false,
                notifications: []
            };
        }

        const notifications = data.data.map(log => ({
            action: log.action,
            timestamp: new Date(log.timestamp).toLocaleString(),
            performer: log.action_by_name || log.requested_by_name || 'System'
        }));

        return {
            success: true,
            notifications: notifications
        };

    } catch (error) {
        console.error('[mailing.js] Error getting notification status:', error);
        return {
            success: false,
            notifications: []
        };
    }
}

/**
 * Resends a specific notification if it failed
 */
export async function resendNotification(notificationType, orderId, additionalData = {}) {
    try {
        let endpoint = '';
        let payload = { orderId };

        switch (notificationType) {
            case 'EDIT_REQUEST':
                endpoint = 'request_edit';
                payload.reason = additionalData.reason || 'Order needs to be edited';
                break;

            case 'EDIT_APPROVAL':
                endpoint = 'release_for_edit';
                payload.tokenId = additionalData.tokenId;
                payload.releasedBy = additionalData.releasedBy || 36;
                break;

            case 'EDIT_SUBMISSION':
                endpoint = 'submit_edit';
                payload.tokenId = additionalData.tokenId;
                break;

            default:
                throw new Error('Unknown notification type');
        }

        const response = await fetch(
            `${MAILER_BASE_URL}PFmailEditOrder.php?action=${endpoint}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Failed to resend notification');
        }

        return {
            success: true,
            message: `${notificationType} notification resent successfully`
        };

    } catch (error) {
        console.error('[mailing.js] Error resending notification:', error);
        return {
            success: false,
            message: error.message
        };
    }
}

/**
 * Formats notification history for display
 */
export function formatNotificationHistory(notifications) {
    if (!notifications || notifications.length === 0) {
        return '<p style="color: #6c757d; font-style: italic;">No notifications have been sent yet.</p>';
    }

    let html = '<table style="width: 100%; border-collapse: collapse;">';
    html += '<tr style="background-color: #f8f9fa;"><th style="padding: 8px; border: 1px solid #dee2e6; text-align: left;">Action</th><th style="padding: 8px; border: 1px solid #dee2e6; text-align: left;">Timestamp</th><th style="padding: 8px; border: 1px solid #dee2e6; text-align: left;">Sent By</th></tr>';

    notifications.forEach(notif => {
        const actionDisplay = notif.action
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());

        html += `
            <tr>
                <td style="padding: 8px; border: 1px solid #dee2e6;"><strong>${actionDisplay}</strong></td>
                <td style="padding: 8px; border: 1px solid #dee2e6; font-size: 12px;">${notif.timestamp}</td>
                <td style="padding: 8px; border: 1px solid #dee2e6; font-size: 12px;">${notif.performer}</td>
            </tr>
        `;
    });

    html += '</table>';
    return html;
}

/**
 * Shows notification status in a modal
 */
export async function showNotificationStatus(orderId) {
    try {
        Swal.fire({
            title: 'Loading Status',
            html: 'Please wait...',
            timerProgressBar: true,
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        const result = await getNotificationStatus(orderId);

        if (!result.success) {
            Swal.fire({
                icon: 'warning',
                title: 'Could Not Load Status',
                text: 'Unable to retrieve notification history'
            });
            return;
        }

        const formattedHtml = formatNotificationHistory(result.notifications);

        Swal.fire({
            icon: 'info',
            title: `Order #${orderId} - Notification History`,
            html: formattedHtml,
            confirmButtonText: 'Close',
            width: '600px'
        });

    } catch (error) {
        console.error('[mailing.js] Error showing notification status:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'An error occurred while loading notification status'
        });
    }
}

/**
 * Validates email address format
 */
export function validateEmailAddress(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Gets available notification actions for an order
 */
export function getAvailableNotificationActions(orderId, scenario) {
    const actions = [];

    switch (scenario) {
        case 'SCENARIO_1':
            actions.push('send_to_next_approver');
            break;
        case 'SCENARIO_2':
            actions.push('send_reactivation');
            break;
        case 'SCENARIO_3':
            actions.push('no_notification_needed');
            break;
    }

    return actions;
}

export default {
    sendEditRequestNotification,
    sendEditApprovalNotification,
    sendEditSubmissionNotification,
    getNotificationStatus,
    resendNotification,
    formatNotificationHistory,
    showNotificationStatus,
    validateEmailAddress,
    getAvailableNotificationActions
};