// Copy to clipboard functionality
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('Copied to clipboard!');
    });
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
        const response = await fetch('/dashboard/dismiss-next-steps', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        if (response.ok) {
            const banner = document.getElementById('nextStepsBanner');
            if (banner) {
                banner.style.transition = 'opacity 0.3s';
                banner.style.opacity = '0';
                setTimeout(() => banner.remove(), 300);
            }
        }
    } catch (error) {
        console.error('Error dismissing banner:', error);
    }
}

// Auto-refresh dashboard if server is provisioning
const serverStatus = document.querySelector('.status');
if (serverStatus && (serverStatus.textContent.includes('provisioning') || serverStatus.textContent.includes('pending'))) {
    setTimeout(() => {
        window.location.reload();
    }, 15000); // Refresh every 15 seconds
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
        
        // Only poll if status is pending or deploying
        if (status === 'pending' || status === 'deploying') {
            try {
                const response = await fetch(`/api/deployment-status/${deploymentId}`);
                if (response.ok) {
                    const data = await response.json();
                    
                    // Update status badge
                    const statusBadge = element.querySelector('.deployment-status-badge');
                    if (statusBadge && data.status !== status) {
                        statusBadge.textContent = data.status.toUpperCase();
                        statusBadge.className = `deployment-status-badge px-2 py-1 text-xs font-bold uppercase rounded ${
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
if (document.querySelector('[data-deployment-status="pending"], [data-deployment-status="deploying"]')) {
    pollDeploymentStatus(); // Poll immediately
    setInterval(pollDeploymentStatus, 3000); // Then every 3 seconds
}

// Add loading states to forms
document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', function(e) {
        const btn = this.querySelector('button[type="submit"]');
        if (btn && !btn.classList.contains('btn-loading')) {
            btn.classList.add('btn-loading');
            btn.disabled = true;
        }
    });
});
