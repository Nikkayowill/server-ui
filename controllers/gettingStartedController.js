const { getHTMLHead, getFooter, getScripts, getResponsiveNav } = require('../helpers');

exports.showGettingStarted = (req, res) => {
  res.send(`
${getHTMLHead('Getting Started - Basement')}
    <link rel="stylesheet" href="/css/pages.css">
</head>
<body>
    <div class="matrix-bg"></div>
    
    ${getResponsiveNav(req)}
    
    <div class="content">
        <h1>Getting Started with Your Server</h1>
        
        <h2 style="color: var(--glow); font-size: 24px; margin: 32px 0 16px;">Step 1: Point Your Domain</h2>
        
        <p>When you purchase a server, we automatically create it and install everything needed. Now you need to point your domain to your new server.</p>
        
        <h3 style="color: #88FE00; margin: 24px 0 16px;">Getting Your Server's IP Address</h3>
        <p>1. Log in to your <a href="/dashboard" style="color: var(--glow); text-decoration: underline;">dashboard</a></p>
        <p>2. Go to "My Servers" and find your server</p>
        <p>3. Copy the <strong>IP Address</strong> (looks like: 64.23.145.12)</p>
        
        <h3 style="color: #88FE00; margin: 24px 0 16px;">Update Your Domain's DNS Records</h3>
        <p>You bought your domain from somewhere like GoDaddy, Namecheap, or another registrar. Log in there and find your DNS settings.</p>
        
        <p><strong>Common Steps:</strong></p>
        <ol style="padding-left: 24px; line-height: 2;">
            <li>Log into your domain registrar (GoDaddy, Namecheap, Bluehost, etc.)</li>
            <li>Find "DNS Settings", "Manage DNS", or "Name Servers"</li>
            <li>Look for "A Record"</li>
            <li>Set the A Record to point to your server's IP address
                <div style="background: rgba(136, 254, 0, 0.05); border-left: 3px solid var(--glow); padding: 12px; margin: 12px 0; font-family: monospace; font-size: 12px;">
                    Type: A<br>
                    Host: @ (or your domain name)<br>
                    Value: 64.23.145.12 (your server IP)
                </div>
            </li>
            <li>Save the changes</li>
        </ol>
        
        <h2 style="color: var(--glow); font-size: 24px; margin: 32px 0 16px;">Step 2: Wait for DNS Propagation</h2>
        <p>DNS changes take <strong>24-48 hours</strong> to fully propagate across the internet. Sometimes it's faster (minutes), sometimes slower (days). Be patient.</p>
        
        <p>To check if your domain is pointing correctly:</p>
        <p>
            Visit <a href="https://mxtoolbox.com/dnsrecord.aspx" target="_blank" style="color: var(--glow); text-decoration: underline;">MXToolbox DNS Lookup</a> 
            and enter your domain. It should show your server's IP address.
        </p>
        
        <h2 style="color: var(--glow); font-size: 24px; margin: 32px 0 16px;">Step 3: Get Free SSL Certificate</h2>
        
        <p>Once your domain is pointing to your server (DNS has propagated):</p>
        
        <ol style="padding-left: 24px; line-height: 2;">
            <li>Go back to <a href="/dashboard" style="color: var(--glow); text-decoration: underline;">your dashboard</a></li>
            <li>Find your server in "My Servers"</li>
            <li>Click the <strong>blue "Domain" button</strong></li>
            <li>Enter your domain name (example.com) and click "Assign & Activate SSL"</li>
        </ol>
        
        <p style="background: rgba(136, 254, 0, 0.05); border-left: 3px solid var(--glow); padding: 12px; margin: 12px 0;">
            <strong>⚠️ Important:</strong> Don't click this until your domain is actually pointing to your server. 
            It will fail if DNS hasn't propagated yet.
        </p>
        
        <h2 style="color: var(--glow); font-size: 24px; margin: 32px 0 16px;">Step 4: SSH Into Your Server</h2>
        
        <p>Once everything is set up, you can SSH into your server to deploy code, configure services, etc.</p>
        
        <div style="background: rgba(136, 254, 0, 0.05); border-left: 3px solid var(--glow); padding: 12px; margin: 12px 0; font-family: monospace; font-size: 12px;">
            ssh root@your-ip-address<br>
            (enter password when prompted)
        </div>
        
        <h2 style="color: var(--glow); font-size: 24px; margin: 32px 0 16px;">What's Already Installed?</h2>
        
        <ul style="padding-left: 24px; line-height: 2;">
            <li><strong>Nginx</strong> - Web server (ready to serve your sites)</li>
            <li><strong>Certbot</strong> - Automatic SSL certificate management</li>
            <li><strong>Firewall</strong> - Basic security configured</li>
            <li><strong>Ubuntu 22.04</strong> - Latest stable Linux version</li>
        </ul>
        
        <h2 style="color: var(--glow); font-size: 24px; margin: 32px 0 16px;">Need Help?</h2>
        
        <p><a href="/docs" style="color: var(--glow); text-decoration: underline;">Check our docs</a> or <a href="/contact" style="color: var(--glow); text-decoration: underline;">contact support</a></p>
        
        <a href="/dashboard" class="link-back">Back to dashboard</a>
    </div>
    
    ${getFooter()}
    ${getScripts('nav.js')}
  `);
};
