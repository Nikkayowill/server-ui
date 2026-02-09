// ============================================
// DASHBOARD UTILITY FUNCTIONS
// (Navigation and sidebar toggle handled by inline scripts in template)
// ============================================

// Cache for fetched credentials to avoid repeated API calls
const credentialsCache = {};

// Fetch credentials securely on-demand
async function fetchCredentials(type) {
    // Return cached if available
    if (credentialsCache[type]) {
        return credentialsCache[type];
    }
    
    try {
        const response = await fetch(`/dashboard/api/credentials?type=${type}`, {
            method: 'GET',
            credentials: 'same-origin'
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch credentials');
        }
        
        const data = await response.json();
        credentialsCache[type] = data;
        return data;
    } catch (error) {
        console.error('Error fetching credentials:', error);
        throw error;
    }
}

// Fetch and show a specific credential field
async function fetchAndShowCredential(type, field, inputId, buttonElement) {
    try {
        buttonElement.textContent = '...';
        buttonElement.disabled = true;
        
        const credentials = await fetchCredentials(type);
        const input = document.getElementById(inputId);
        
        if (!input || !credentials[type]) {
            throw new Error('Credential not found');
        }
        
        const value = credentials[type][field];
        if (value === undefined) {
            throw new Error('Field not found');
        }
        
        if (input.type === 'password') {
            input.value = value;
            input.type = 'text';
            buttonElement.textContent = 'Hide';
        } else {
            input.type = 'password';
            input.value = '••••••••';
            buttonElement.textContent = 'Show';
        }
        
        buttonElement.disabled = false;
    } catch (error) {
        console.error('Error showing credential:', error);
        buttonElement.textContent = 'Error';
        setTimeout(() => {
            buttonElement.textContent = 'Show';
            buttonElement.disabled = false;
        }, 2000);
    }
}

// Fetch credential and copy to clipboard
async function fetchAndCopyCredential(type, field, buttonElement) {
    // Find the button that was clicked if not passed
    if (!buttonElement) {
        buttonElement = event?.target;
    }
    
    try {
        if (buttonElement) {
            buttonElement.textContent = '...';
            buttonElement.disabled = true;
        }
        
        const credentials = await fetchCredentials(type);
        
        if (!credentials[type]) {
            throw new Error('Credential type not found');
        }
        
        const value = credentials[type][field];
        if (value === undefined) {
            throw new Error('Field not found');
        }
        
        await navigator.clipboard.writeText(value);
        
        if (buttonElement) {
            buttonElement.textContent = '✓';
            buttonElement.classList.add('bg-green-600');
            setTimeout(() => {
                buttonElement.textContent = 'Copy';
                buttonElement.classList.remove('bg-green-600');
                buttonElement.disabled = false;
            }, 1500);
        }
    } catch (error) {
        console.error('Error copying credential:', error);
        if (buttonElement) {
            buttonElement.textContent = 'Error';
            setTimeout(() => {
                buttonElement.textContent = 'Copy';
                buttonElement.disabled = false;
            }, 2000);
        }
    }
}

// Copy to clipboard functionality - accepts element ID or direct text
function copyToClipboard(elementIdOrText, buttonElement) {
    let textToCopy;
    
    // Check if it's an element ID
    const element = document.getElementById(elementIdOrText);
    if (element) {
        textToCopy = element.value || element.textContent;
    } else {
        // It's direct text
        textToCopy = elementIdOrText;
    }
    
    navigator.clipboard.writeText(textToCopy).then(() => {
        // Visual feedback on button
        if (buttonElement) {
            const originalText = buttonElement.textContent;
            buttonElement.textContent = '✓';
            buttonElement.classList.add('bg-green-600');
            setTimeout(() => {
                buttonElement.textContent = originalText;
                buttonElement.classList.remove('bg-green-600');
            }, 1500);
        } else {
            alert('Copied to clipboard!');
        }
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy to clipboard');
    });
}

// Toggle password visibility
function togglePassword(elementId, buttonElement) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    if (element.type === 'password') {
        element.type = 'text';
        if (buttonElement) buttonElement.textContent = 'Hide';
    } else {
        element.type = 'password';
        if (buttonElement) buttonElement.textContent = 'Show';
    }
}

// Refresh dashboard manually
function refreshDashboard() {
    window.location.reload();
}

// Toggle deployment log visibility
function toggleDeploymentLog(deploymentId) {
    const logRow = document.getElementById(`deployment-log-${deploymentId}`);
    if (logRow) {
        logRow.classList.toggle('hidden');
    }
}

// Dismiss next steps banner
async function dismissNextSteps() {
    try {
        const banner = document.getElementById('nextStepsBanner');
        const csrfToken = banner?.dataset.csrf;
        
        const response = await fetch('/dashboard/dismiss-next-steps', { 
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            },
            body: JSON.stringify({ _csrf: csrfToken })
        });
        if (response.ok) {
            if (banner) {
                banner.style.transition = 'opacity 0.3s';
                banner.style.opacity = '0';
                setTimeout(() => banner.remove(), 300);
            }
        }
    } catch (error) {
        console.error('Error dismissing banner:', error);
        // Still hide it visually even if API fails
        const banner = document.getElementById('nextStepsBanner');
        if (banner) banner.remove();
    }
}

// Auto-refresh dashboard every 15 seconds if server is provisioning
const serverStatusElement = document.querySelector('[data-server-status]');
const urlParams = new URLSearchParams(window.location.search);
const isProvisioningParam = urlParams.get('provisioning') === 'true';
const isDemoProvisioning = serverStatusElement?.dataset.demoProvisioning === 'true';

// Check if we're in provisioning state (either from data attribute or URL param)
const currentStatus = serverStatusElement?.dataset.serverStatus;
const isProvisioning = currentStatus === 'provisioning' || isProvisioningParam;

if (isProvisioning && currentStatus !== 'running') {
    // Demo provisioning mode: wait 30 seconds then show populated dashboard
    if (isDemoProvisioning) {
        console.log('Demo provisioning mode: will show running dashboard in 30 seconds...');
        setTimeout(() => {
            console.log('Demo provisioning complete, redirecting to running dashboard...');
            window.location.href = '/dashboard?demo=true';
        }, 30000); // 30 seconds for demo
    } else {
        // Real provisioning: refresh after 10 seconds to check status
        console.log('Server is provisioning, will auto-refresh in 10 seconds...');
        setTimeout(() => {
            console.log('Auto-refreshing dashboard to check server status...');
            // Remove the provisioning param on refresh to avoid infinite loop once server is ready
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete('provisioning');
            window.location.href = newUrl.toString();
        }, 10000); // 10 seconds
    }
}

// Auto-fade alerts after 5 seconds
setTimeout(() => {
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
        alert.style.transition = 'opacity 0.5s';
        alert.style.opacity = '0';
        setTimeout(() => alert.remove(), 500);
    });
}, 5000);

// Poll deployment status for active deployments
function pollDeploymentStatus() {
    const activeDeployments = document.querySelectorAll('[data-deployment-id]');
    
    activeDeployments.forEach(async (element) => {
        const deploymentId = element.dataset.deploymentId;
        const status = element.dataset.deploymentStatus;
        
        // Only poll if status is pending, deploying, or in-progress
        if (status === 'pending' || status === 'deploying' || status === 'in-progress') {
            try {
                const response = await fetch(`/api/deployment-status/${deploymentId}`);
                if (response.ok) {
                    const data = await response.json();
                    
                    // Update status badge
                    const statusBadge = element.querySelector('.deployment-status-badge');
                    if (statusBadge && data.status !== status) {
                        const isActive = (data.status === 'pending' || data.status === 'deploying' || data.status === 'in-progress');
                        const spinner = isActive ? 
                            `<svg class="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>` : '';
                        const displayStatus = data.status === 'pending' ? 'Building' : 
                                              data.status === 'deploying' ? 'Deploying' : 
                                              data.status === 'in-progress' ? 'Building' :
                                              data.status.toUpperCase();
                        statusBadge.innerHTML = spinner + displayStatus;
                        statusBadge.className = `deployment-status-badge px-2 py-1 text-xs font-bold uppercase rounded inline-flex items-center gap-2 ${
                            data.status === 'success' ? 'bg-green-900 text-green-300' : 
                            data.status === 'failed' ? 'bg-red-900 text-red-300' : 
                            'bg-yellow-900 text-yellow-300'
                        }`;
                        element.dataset.deploymentStatus = data.status;
                    }
                    
                    // Update output if it exists (in the log row, not the main row)
                    const logRow = document.getElementById(`deployment-log-${deploymentId}`);
                    if (logRow) {
                        const outputElement = logRow.querySelector('.deployment-output');
                        if (outputElement && data.output) {
                            outputElement.textContent = data.output;
                            // Auto-scroll to bottom
                            outputElement.scrollTop = outputElement.scrollHeight;
                        }
                    }
                    
                    // Reload page if deployment finished
                    if (data.status === 'success' || data.status === 'failed') {
                        setTimeout(() => window.location.reload(), 2000);
                    }
                }
            } catch (error) {
                console.error('Error polling deployment:', error);
            }
        }
    });
}

// Start polling if there are active deployments
if (document.querySelector('[data-deployment-status="pending"], [data-deployment-status="deploying"], [data-deployment-status="in-progress"]')) {
    pollDeploymentStatus(); // Poll immediately
    setInterval(pollDeploymentStatus, 3000); // Then every 3 seconds
}

// AJAX form submission for database setup (prevents page jump)
document.querySelectorAll('form[action="/setup-database"]').forEach(form => {
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const btn = this.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        const dbType = this.querySelector('input[name="database_type"]').value;
        const csrfToken = this.querySelector('input[name="_csrf"]').value;
        
        // Show loading state
        btn.disabled = true;
        btn.innerHTML = `<svg class="animate-spin h-4 w-4 inline mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Installing ${dbType === 'postgres' ? 'PostgreSQL' : 'MongoDB'}...`;
        btn.classList.add('opacity-75');
        
        try {
            const response = await fetch('/setup-database', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `database_type=${dbType}&_csrf=${csrfToken}`
            });
            
            if (response.redirected) {
                // Show success message in place
                btn.innerHTML = `<svg class="h-4 w-4 inline mr-2" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>Installing... Refresh in 2-3 min`;
                btn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
                btn.classList.add('bg-green-600');
            }
        } catch (error) {
            btn.textContent = 'Error - Try Again';
            btn.disabled = false;
            btn.classList.remove('opacity-75');
        }
    });
});

// Add loading states to other forms (not database setup)
document.querySelectorAll('form:not([action="/setup-database"])').forEach(form => {
    form.addEventListener('submit', function(e) {
        const btn = this.querySelector('button[type="submit"]');
        if (btn && !btn.classList.contains('btn-loading')) {
            btn.classList.add('btn-loading');
            btn.disabled = true;
        }
    });
});
// ============================================
// DEMO DEPLOY ANIMATION
// ============================================

function startDemoDeploy(event) {
    event.preventDefault();
    
    const progressDiv = document.getElementById('demo-deploy-progress');
    const statusText = document.getElementById('demo-deploy-status');
    const logDiv = document.getElementById('demo-deploy-log');
    const spinnerDiv = document.getElementById('demo-deploy-spinner');
    
    if (!progressDiv || !statusText || !logDiv) {
        console.error('Demo deploy elements not found');
        return false;
    }
    
    // Get the git URL from form
    const gitUrlInput = document.querySelector('input[name="git_url"]');
    const gitUrl = gitUrlInput?.value || 'https://github.com/demo-user/project';
    
    // Show progress area
    progressDiv.classList.remove('hidden');
    
    // Animation sequence
    const steps = [
        { delay: 0, status: 'Cloning repository...', log: `> git clone ${gitUrl}` },
        { delay: 1500, status: 'Cloning repository...', log: '> Receiving objects: 100% (128/128), done.' },
        { delay: 2500, status: 'Installing dependencies...', log: '> npm install' },
        { delay: 4000, status: 'Installing dependencies...', log: '> added 847 packages in 12.3s' },
        { delay: 5500, status: 'Building application...', log: '> npm run build' },
        { delay: 7000, status: 'Building application...', log: '> ✓ Build completed successfully' },
        { delay: 8500, status: 'Deploying to server...', log: '> Uploading to /var/www/app...' },
        { delay: 10000, status: 'Deploying to server...', log: '> Configuring nginx reverse proxy...' },
        { delay: 11500, status: 'Starting application...', log: '> pm2 start ecosystem.config.js' },
        { delay: 13000, status: 'Verifying deployment...', log: '> Health check: OK (HTTP 200)' },
    ];
    
    // Clear initial log
    logDiv.innerHTML = '';
    
    // Run through steps
    steps.forEach(step => {
        setTimeout(() => {
            statusText.textContent = step.status;
            const logLine = document.createElement('p');
            logLine.textContent = step.log;
            logDiv.appendChild(logLine);
            // Auto-scroll to bottom
            logDiv.scrollTop = logDiv.scrollHeight;
        }, step.delay);
    });
    
    // Final success state
    setTimeout(() => {
        statusText.textContent = 'Deployment successful!';
        statusText.classList.remove('text-[var(--dash-text-primary)]');
        statusText.classList.add('text-green-400');
        
        // Replace spinner with checkmark
        spinnerDiv.innerHTML = `
            <svg class="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
        `;
        
        // Add final log entry
        const finalLine = document.createElement('p');
        finalLine.className = 'text-green-400 font-semibold';
        finalLine.textContent = '> ✓ Deployment complete! Your app is now live.';
        logDiv.appendChild(finalLine);
        
        // Add a link to view the deployment
        const linkLine = document.createElement('p');
        linkLine.className = 'mt-2';
        linkLine.innerHTML = '→ <a href="https://demo.cloudedbasement.ca" target="_blank" class="text-[var(--dash-accent)] hover:underline">https://demo.cloudedbasement.ca</a>';
        logDiv.appendChild(linkLine);
    }, 14500);
    
    return false;
}

// ============================================
// DEMO ADD DOMAIN
// ============================================

function addDemoDomain(event) {
    event.preventDefault();
    
    const form = event.target;
    const domainInput = form.querySelector('input[name="domain"]');
    const domain = domainInput?.value || 'demo.cloudedbasement.ca';
    const submitBtn = form.querySelector('button[type="submit"]');
    
    // Disable button and show loading
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="animate-pulse">Adding...</span>';
    }
    
    // Simulate delay
    setTimeout(() => {
        // Find the domains list container
        const domainsSection = form.closest('section') || form.parentElement;
        const domainsContainer = domainsSection?.querySelector('.space-y-3') || 
                                  domainsSection?.querySelector('.text-center.py-8');
        
        if (domainsContainer) {
            // Create new domain card
            const newDomainHTML = `
                <div class="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg gap-3 animate-pulse" style="background: var(--dash-bg); border: 1px solid var(--dash-card-border);">
                    <div class="flex items-center gap-3 min-w-0">
                        <span class="text-yellow-400 shrink-0">⏳</span>
                        <div class="min-w-0">
                            <a href="https://${domain}" target="_blank" class="text-sm font-medium text-[var(--dash-text-primary)] hover:text-[var(--dash-accent)] block truncate">${domain}</a>
                            <p class="text-xs text-[var(--dash-text-muted)]">Setting up SSL...</p>
                        </div>
                    </div>
                </div>
            `;
            
            // Replace "no domains" message or append to list
            if (domainsContainer.classList.contains('text-center')) {
                domainsContainer.outerHTML = `<div class="space-y-3">${newDomainHTML}</div>`;
            } else {
                domainsContainer.insertAdjacentHTML('beforeend', newDomainHTML);
            }
        }
        
        // Show success and reset form
        domainInput.value = '';
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '✓ Added!';
            submitBtn.classList.add('bg-green-600');
            setTimeout(() => {
                submitBtn.innerHTML = 'Add Domain';
                submitBtn.classList.remove('bg-green-600');
            }, 2000);
        }
        
        // After 3 seconds, update to show SSL complete
        setTimeout(() => {
            const pendingDomain = document.querySelector('.animate-pulse');
            if (pendingDomain) {
                pendingDomain.classList.remove('animate-pulse');
                pendingDomain.querySelector('.text-yellow-400').textContent = '🔒';
                pendingDomain.querySelector('.text-yellow-400').classList.remove('text-yellow-400');
                pendingDomain.querySelector('.text-yellow-400')?.classList.add('text-green-400');
                const statusText = pendingDomain.querySelector('.text-xs');
                if (statusText) statusText.textContent = 'SSL active';
            }
        }, 3000);
        
    }, 1500);
    
    return false;
}