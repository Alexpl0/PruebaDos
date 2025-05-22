/**
 * Sends a notification email to the next approver in line
 * @param {number} orderId - The Premium Freight order ID
 * @returns {Promise} - Promise resolving to the result of the email sending operation
 */
function sendApprovalNotification(orderId) {
    return new Promise((resolve, reject) => {
        fetch('https://grammermx.com/Jesus/PruebaDos/mailer/PFmailNotification.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: orderId })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                resolve(data);
            } else {
                reject(new Error(data.message || 'Failed to send notification'));
            }
        })
        .catch(error => {
            reject(error);
        });
    });
}

function sendNotification(idOrder, newStatusId){
    const nextStatusId = newStatusId + 1;

    const data ={
        orderId: idOrder,
        statusId: nextStatusId
    }

    try {
        const response = fetch('https://grammermx.com/jesus/pruebados/dao/conections/daoSendNotification.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: selectedOrder.id, statusId: nextStatusId })
        });

        const result = response.json();
        if (!result.success) {
            throw new Error(result.message || 'Error sending notification.');
        }
    }
    catch (error) {
        console.error('Error sending notification:', error);
    }
   
}
