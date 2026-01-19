const pool = require('../db');
const { getDashboardHead, getFooter, getScripts, getResponsiveNav } = require('../helpers');

exports.showGettingStarted = async (req, res) => {
  // Check payment and server status
  try {
    const paymentCheck = await pool.query(
      'SELECT * FROM payments WHERE user_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT 1',
      [req.session.userId, 'succeeded']
    );
    
    const hasPaid = paymentCheck.rows.length > 0;
    const plan = hasPaid ? paymentCheck.rows[0].plan : null;
    
    const serverCheck = await pool.query(
      'SELECT * FROM servers WHERE user_id = $1',
      [req.session.userId]
    );
    
    const hasServer = serverCheck.rows.length > 0;
    
    const userResult = await pool.query(
      'SELECT email FROM users WHERE id = $1',
      [req.session.userId]
    );
    const userEmail = userResult.rows[0].email;
  
  res.send(`
${getDashboardHead('Getting Started - Clouded Basement')}
    <style>
      .wizard-container {
        max-width: 800px;
        margin: 80px auto 40px;
        padding: 0 20px;
      }
      
      .wizard-steps {
        display: flex;
        justify-content: space-between;
        margin-bottom: 48px;
        position: relative;
      }
      
      .wizard-steps::before {
        content: '';
        position: absolute;
        top: 20px;
        left: 40px;
        right: 40px;
        height: 2px;
        background: rgba(45, 167, 223, 0.2);
        z-index: 0;
      }
      
      .wizard-step {
        display: flex;
        flex-direction: column;
        align-items: center;
        position: relative;
        z-index: 1;
      }
      
      .step-circle {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(2, 8, 20, 0.8);
        border: 2px solid rgba(45, 167, 223, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        color: #8892a0;
        margin-bottom: 8px;
      }
      
      .step-circle.active {
        background: #2DA7DF;
        border-color: #2DA7DF;
        color: #000;
      }
      
      .step-circle.completed {
        background: rgba(45, 167, 223, 0.2);
        border-color: #2DA7DF;
        color: #2DA7DF;
      }
      
      .step-label {
        font-size: 13px;
        color: #8892a0;
        text-align: center;
      }
      
      .step-label.active {
        color: #2DA7DF;
        font-weight: 600;
      }
      
      .onboarding-card {
        background: rgba(2, 8, 20, 0.6);
        border: 1px solid rgba(45, 167, 223, 0.2);
        border-radius: 12px;
        padding: 40px;
        margin-bottom: 24px;
      }
      
      .onboarding-card h2 {
        color: #fff;
        margin-top: 0;
        margin-bottom: 16px;
        font-size: 28px;
      }
      
      .onboarding-card p {
        color: #a0a8b8;
        line-height: 1.6;
        margin-bottom: 16px;
      }
      
      .info-box {
        background: rgba(45, 167, 223, 0.05);
        border-left: 3px solid #2DA7DF;
        padding: 16px 20px;
        margin: 24px 0;
        border-radius: 4px;
      }
      
      .info-box p {
        margin: 0;
        color: #e0e6f0;
        font-size: 14px;
      }
      
      .checklist {
        list-style: none;
        padding: 0;
        margin: 24px 0;
      }
      
      .checklist li {
        padding: 12px 0;
        color: #a0a8b8;
        display: flex;
        align-items: start;
        gap: 12px;
      }
      
      .checklist li::before {
        content: "✓";
        color: #2DA7DF;
        font-weight: 700;
        font-size: 18px;
        flex-shrink: 0;
      }
      
      .btn-group {
        display: flex;
        gap: 12px;
        margin-top: 32px;
      }
      
      .btn {
        flex: 1;
        text-align: center;
        padding: 14px 24px;
        border-radius: 8px;
        text-decoration: none;
        font-weight: 600;
        display: inline-block;
        transition: all 0.2s;
      }
      
      .btn.primary {
        background: #2DA7DF;
        color: #000;
      }
      
      .btn.primary:hover {
        background: #20B1DC;
        transform: translateY(-2px);
      }
      
      .btn:not(.primary) {
        background: rgba(45, 167, 223, 0.1);
        border: 1px solid rgba(45, 167, 223, 0.3);
        color: #2DA7DF;
      }
      
      .server-request-form {
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(45, 167, 223, 0.2);
        border-radius: 8px;
        padding: 24px;
        margin: 24px 0;
      }
      
      .form-group {
        margin-bottom: 20px;
      }
      
      .form-group label {
        display: block;
        color: #e0e6f0;
        margin-bottom: 8px;
        font-weight: 500;
      }
      
      .form-group select,
      .form-group input {
        width: 100%;
        padding: 12px;
        background: rgba(0, 0, 0, 0.4);
        border: 1px solid rgba(45, 167, 223, 0.2);
        border-radius: 6px;
        color: #e0e6f0;
        font-size: 14px;
        box-sizing: border-box;
      }
      
      .form-group input::placeholder {
        color: #6b7280;
      }
      
      button[type="submit"] {
        width: 100%;
        margin-top: 16px;
        cursor: pointer;
      }
      
      @media (max-width: 768px) {
        .wizard-container {
          margin-top: 60px;
        }
        
        .wizard-steps {
          flex-direction: column;
          gap: 24px;
        }
        
        .wizard-steps::before {
          display: none;
        }
        
        .wizard-step {
          flex-direction: row;
          gap: 16px;
          align-items: center;
        }
        
        .onboarding-card {
          padding: 24px;
        }
        
        .onboarding-card h2 {
          font-size: 22px;
        }
        
        .btn-group {
          flex-direction: column;
        }
      }
    </style>
</head>
<body>
    <div class="matrix-bg"></div>
    
    ${getResponsiveNav(req)}
    
    <div class="wizard-container">
      <h1 style="text-align: center; margin-bottom: 48px; color: #fff; font-size: 36px;">Welcome to Clouded Basement</h1>
      
      <div class="wizard-steps">
        <div class="wizard-step">
          <div class="step-circle ${hasPaid ? 'completed' : 'active'}">1</div>
          <span class="step-label ${!hasPaid ? 'active' : ''}">Payment</span>
        </div>
        <div class="wizard-step">
          <div class="step-circle ${hasServer ? 'active' : ''}">2</div>
          <span class="step-label ${hasServer ? 'active' : ''}">Deploy</span>
        </div>
      </div>
      
      ${!hasPaid ? `
        <div class="onboarding-card">
          <h2>Step 1: Choose Your Plan</h2>
          <p>You're almost there! To get started, you'll need to select a hosting plan.</p>
          
          <div class="bg-cyan-900/10 border border-cyan-500/20 rounded-lg p-6 my-6">
            <p class="text-gray-400"><strong class="text-cyan-400">Founder Plan:</strong> $10/month for life — Lock in this price forever. Only 10 spots available!</p>
          </div>
          
          <ul class="checklist">
            <li>1GB RAM, 25GB SSD Storage</li>
            <li>Full SSH Root Access</li>
            <li>Pre-installed: Node.js, Python, Git, Nginx</li>
            <li>Custom Domain + Free SSL</li>
            <li>Direct support from the founder</li>
          </ul>
          
          <div class="btn-group">
            <a href="/pricing" class="btn primary">View Plans & Purchase</a>
            <a href="/docs" class="btn">Learn More</a>
          </div>
        </div>
      ` : !hasServer ? `
        <div class="onboarding-card">
          <h2>Step 2: Server Provisioning</h2>
          <p>Great! Your ${plan} plan is confirmed. Your server is being created automatically.</p>
          
          <div style="background: rgba(45, 167, 223, 0.1); border: 2px solid #2DA7DF; border-radius: 8px; padding: 32px; text-align: center; margin: 24px 0;">
            <h3 style="color: #2DA7DF; margin-top: 0; font-size: 20px;">⏳ Server Provisioning in Progress</h3>
            <p style="color: #e0e6f0; margin-bottom: 16px;">We're automatically setting up your server! You'll receive an email at <strong>${userEmail}</strong> when it's ready.</p>
            <p style="color: #8892a0; font-size: 14px; margin: 0;">Estimated completion: 5-10 minutes</p>
            <p style="color: #8892a0; font-size: 14px; margin-top: 8px;">Please check back shortly or wait for the email notification.</p>
          </div>
          
          <div class="bg-cyan-900/10 border border-cyan-500/20 rounded-lg p-6 my-6">
            <p class="text-gray-400"><strong class="text-white">What's happening:</strong> Your DigitalOcean droplet is being created and configured with SSH access, Node.js, Python, Git, and Nginx.</p>
          </div>
          
          <p style="text-align: center; margin-top: 24px; color: #8892a0; font-size: 14px;">
            Questions? Email <a href="mailto:support@cloudedbasement.ca" style="color: #2DA7DF; text-decoration: none;">support@cloudedbasement.ca</a>
          </p>
        </div>
      ` : `
        <div class="onboarding-card">
          <h2>🎉 Your Server is Ready!</h2>
          <p>Congrats! Your server is set up and ready to use.</p>
          
          <ul class="checklist">
            <li>Check your email for SSH credentials</li>
            <li>Connect via SSH: <code style="background: rgba(0,0,0,0.4); padding: 2px 6px; border-radius: 3px;">ssh root@your-server-ip</code></li>
            <li>Deploy your first app using our guides</li>
            <li>Add a custom domain (optional)</li>
          </ul>
          
          <div class="btn-group">
            <a href="/dashboard" class="btn primary">Go to Dashboard</a>
            <a href="/docs" class="btn">View Documentation</a>
          </div>
        </div>
      `}
    </div>
    
    ${getFooter()}
</body>
</html>
  `);
  
  } catch (err) {
    console.error('Getting started page error:', err);
    res.status(500).send('Server error');
  }
};
