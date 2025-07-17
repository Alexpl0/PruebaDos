/**
 * auth-tours.js
 * Defines and controls all tours related to authentication (login, register, recovery).
 * This single file should be included in index.php, register.php, and recovery.php.
 * Location: js/tour/
 */
document.addEventListener('DOMContentLoaded', function() {
    // Check if Driver.js is available
    if (typeof driver === 'undefined') {
        console.error('Driver.js library not loaded!');
        return;
    }

    const driverJs = window.driver.js.driver;
    const currentPage = window.location.pathname.split('/').pop() || 'index.php';

    // --- Tour Definitions ---

    // 1. Login Tour Steps (for index.php)
    const loginTourSteps = [
        { 
            element: '#email', 
            popover: { 
                title: 'Email Address', 
                description: 'First, enter the email address you registered with.',
                side: 'bottom', align: 'start'
            } 
        },
        { 
            element: 'input[type="password"]', 
            popover: { 
                title: 'Password', 
                description: 'Next, enter your password. You can click the eye icon to see what you are typing.',
                side: 'bottom', align: 'start'
            } 
        },
        { 
            element: '#btnLogin', 
            popover: { 
                title: 'Sign In', 
                description: 'Finally, click here to log into your account.',
                side: 'bottom', align: 'start'
            } 
        },
        { 
            popover: { 
                title: 'All Done!', 
                description: "That's it! Now you know how to sign in." 
            } 
        }
    ];

    // 2. Register Tour Steps (Example for register.php)
    // IMPORTANT: Make sure the 'element' IDs match the elements in your register.php file.
    const registerTourSteps = [
        { element: '#fullName', popover: { title: 'Full Name', description: 'Enter your full name here.' } },
        { element: '#email', popover: { title: 'Email', description: 'Use a valid email, you will need to verify it.' } },
        { element: '#password', popover: { title: 'Password', description: 'Choose a strong password.' } },
        { element: '#btnRegister', popover: { title: 'Create Account', description: 'Click here to create your account.' } },
    ];

    // 3. Recovery Tour Steps (Example for recovery.php)
    // IMPORTANT: Make sure the 'element' IDs match the elements in your recovery.php file.
    const recoveryTourSteps = [
        { element: '#email', popover: { title: 'Email Address', description: 'Enter the email address of the account you want to recover.' } },
        { element: '#btnRecover', popover: { title: 'Send Recovery Link', description: 'Click here and we will send a recovery link to your email.' } },
    ];

    // --- Tour Initialization ---
    // We create an object to hold all possible tours
    const tours = {
        'start-login-tour': driverJs({ showProgress: true, steps: loginTourSteps }),
        'start-register-tour': driverJs({ showProgress: true, steps: registerTourSteps }),
        'start-recovery-tour': driverJs({ showProgress: true, steps: recoveryTourSteps }),
    };

    // --- Single Event Listener ---
    // This listener handles all tour triggers from the header menu.
    document.body.addEventListener('click', function(event) {
        const tourId = event.target.id;
        
        // Check if the clicked element's ID corresponds to a tour
        if (tours[tourId]) {
            event.preventDefault();

            // Check if the tour can run on the current page
            const canRunHere = 
                (tourId === 'start-login-tour' && currentPage === 'index.php') ||
                (tourId === 'start-register-tour' && currentPage === 'register.php') ||
                (tourId === 'start-recovery-tour' && currentPage === 'recovery.php');

            if (canRunHere) {
                tours[tourId].drive(); // Start the correct tour
            } else {
                // If the user is on the wrong page, inform them.
                let requiredPage = '';
                if (tourId === 'start-register-tour') requiredPage = 'Sign Up page';
                if (tourId === 'start-recovery-tour') requiredPage = 'Password Recovery page';
                
                Swal.fire({
                    icon: 'info',
                    title: 'Navigation Required',
                    text: `To start this tour, please go to the ${requiredPage}.`,
                });
            }
        }
    });
});
