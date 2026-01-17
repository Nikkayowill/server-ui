// Copy to clipboard functionality
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('Copied to clipboard!');
    });
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
