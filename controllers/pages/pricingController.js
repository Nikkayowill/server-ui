const { getHTMLHead, getScripts, getFooter, getResponsiveNav } = require('../../helpers');
const pool = require('../../db');

exports.showPricing = async (req, res) => {
  // Check if user is logged in and has used trial
  let trialUsed = false;
  let isLoggedIn = !!req.session.userId;
  
  if (isLoggedIn) {
    try {
      const result = await pool.query('SELECT trial_used FROM users WHERE id = $1', [req.session.userId]);
      if (result.rows.length > 0) {
        trialUsed = result.rows[0].trial_used;
      }
    } catch (err) {
      console.error('Error checking trial status:', err);
    }
  }
  
  // Build trial banner based on state
  let trialBanner = '';
  if (!isLoggedIn) {
    // Not logged in - show register link
    trialBanner = `
      <div class="max-w-2xl mx-auto mb-8 px-4">
        <div class="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/40 rounded-xl p-6 text-center">
          <div class="flex items-center justify-center gap-2 mb-2">
            <span class="text-xl font-bold text-white">Try Free for 3 Days</span>
          </div>
          <p class="text-gray-300 text-sm mb-4">No credit card required. Get a real server instantly.</p>
          <a href="/register" class="inline-flex items-center px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-500 hover:scale-105 transition-all">
            Start Free Trial
            <svg class="ml-2 w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
          </a>
        </div>
      </div>`;
  } else if (!trialUsed) {
    // Logged in but hasn't used trial - link to dashboard to start trial
    trialBanner = `
      <div class="max-w-2xl mx-auto mb-8 px-4">
        <div class="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/40 rounded-xl p-6 text-center">
          <div class="flex items-center justify-center gap-2 mb-2">
            <span class="text-xl font-bold text-white">Try Free for 3 Days</span>
          </div>
          <p class="text-gray-300 text-sm mb-4">No credit card required. Get a real server instantly.</p>
          <a href="/dashboard" class="inline-flex items-center px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-500 hover:scale-105 transition-all">
            Start Free Trial
            <svg class="ml-2 w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
          </a>
        </div>
      </div>`;
  }
  // If logged in AND trial used - no banner shown
  
  res.send(`
${getHTMLHead('Pricing - Basement')}
    ${getResponsiveNav(req)}
    
    <main class="bg-black min-h-screen pt-24 pb-16">
      <!-- Free Trial Banner -->
      ${trialBanner}
      
      <section class="py-12 px-4 text-center">
        <h1 class="text-4xl md:text-5xl font-extrabold text-white mb-4">Simple, Transparent Pricing</h1>
        <p class="text-gray-300 text-lg mb-4">One server, deploy as many times as you want.</p>
        <p class="text-blue-400 text-sm mb-8 max-w-md mx-auto">I update, add security, and backup your server for you — you can focus on shipping your apps.</p>
        
        <!-- Billing Toggle -->
        <div class="flex items-center justify-center gap-4 mb-12">
          <span class="text-gray-300 text-sm font-medium billing-label" data-type="monthly">Monthly</span>
          <button id="billingToggle" class="relative w-16 h-8 bg-gray-700 rounded-full transition-all hover:bg-gray-600" onclick="toggleBilling()">
            <div id="billingSlider" class="absolute top-1 left-1 w-6 h-6 bg-blue-400 rounded-full transition-transform duration-300 shadow-[0_0_20px_rgba(96,165,250,0.6)]"></div>
          </button>
          <span class="text-gray-400 text-sm billing-label" data-type="yearly">Yearly <span class="text-blue-400 font-bold">(Save 10%)</span></span>
        </div>
      </section>
      
      <section class="max-w-6xl mx-auto px-8 md:px-12 lg:px-16 pb-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        <!-- BASIC -->
        <div class="bg-gray-900 border border-gray-700 rounded-lg p-8 hover:border-blue-500/50 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)] transition-all duration-300">
          <div class="border-b border-blue-400/20 pb-6 mb-6">
            <div class="text-xl font-bold text-white mb-2">Basic</div>
            <div class="flex items-baseline gap-2 mb-2">
              <div class="pricing-amount" data-monthly="15" data-yearly="162">
                <span class="text-4xl font-extrabold text-blue-300 price-value">$15</span>
                <span class="text-base font-normal text-gray-300 price-interval">/mo</span>
              </div>
            </div>
            <div class="text-sm text-gray-300">Perfect for side projects & learning</div>
          </div>
          
          <div class="mb-6">
            <h5 class="text-xs font-bold uppercase tracking-wide text-blue-400 mb-3">Server Specs</h5>
            <ul class="space-y-2 text-sm">
              <li class="flex justify-between"><span class="text-gray-400">RAM</span><span class="text-white font-medium">1 GB</span></li>
              <li class="flex justify-between"><span class="text-gray-400">CPU</span><span class="text-white font-medium">1 vCPU</span></li>
              <li class="flex justify-between"><span class="text-gray-400">Storage</span><span class="text-white font-medium">25 GB NVMe SSD</span></li>
              <li class="flex justify-between"><span class="text-gray-400">Bandwidth</span><span class="text-white font-medium">1 TB/mo</span></li>
              <li class="flex justify-between"><span class="text-gray-400">Sites</span><span class="text-white font-medium">2 sites</span></li>
            </ul>
          </div>
          
          <div class="mb-6">
            <h5 class="text-xs font-bold uppercase tracking-wide text-blue-400 mb-3">Features Included</h5>
            <ul class="space-y-2 text-sm text-gray-300">
              <li class="flex items-center gap-2"><span class="text-green-400">✓</span> Full SSH & root access</li>
              <li class="flex items-center gap-2"><span class="text-green-400">✓</span> One-click Git deployment</li>
              <li class="flex items-center gap-2"><span class="text-green-400">✓</span> One-click database (Postgres/MongoDB)</li>
              <li class="flex items-center gap-2"><span class="text-green-400">✓</span> Custom domains</li>
              <li class="flex items-center gap-2"><span class="text-green-400">✓</span> Free SSL certificates</li>
              <li class="flex items-center gap-2"><span class="text-green-400">✓</span> Deployment history & logs</li>
              <li class="flex items-center gap-2"><span class="text-green-400">✓</span> Server controls (start/stop/restart)</li>
              <li class="flex items-center gap-2"><span class="text-green-400">✓</span> Email support from a real developer</li>
            </ul>
          </div>
          
          <div class="mb-8">
            <h5 class="text-xs font-bold uppercase tracking-wide text-red-400 mb-3">Not Included</h5>
            <ul class="space-y-2 text-sm text-gray-500">
              <li class="flex items-center gap-2"><span class="text-red-400">✗</span> Automated backups</li>
              <li class="flex items-center gap-2"><span class="text-red-400">✗</span> Priority support</li>
            </ul>
          </div>
          
          <a href="/pay?plan=basic&interval=monthly" class="plan-cta block w-full px-6 py-3 bg-transparent border border-blue-500 text-blue-400 text-center font-medium rounded hover:bg-blue-600 hover:text-white hover:scale-105 hover:shadow-[0_0_30px_rgba(0,102,255,0.6)] transition-all uppercase tracking-wider text-sm" data-plan="basic">Select Basic</a>
        </div>
        
        <!-- PRO -->
        <div class="bg-gray-900 border-2 border-blue-500 rounded-lg p-8 relative transform md:scale-[1.02] shadow-[0_0_40px_rgba(59,130,246,0.2)] hover:shadow-[0_0_50px_rgba(59,130,246,0.3)] transition-all duration-300">
          <div class="popular-badge">Best Value</div>
          <div class="border-b border-blue-300 pb-6 mb-6">
            <div class="text-xl font-bold text-white mb-2">Pro</div>
            <div class="flex items-baseline gap-2 mb-2">
              <div class="pricing-amount" data-monthly="35" data-yearly="378">
                <span class="text-4xl font-extrabold text-blue-300 price-value">$35</span>
                <span class="text-base font-normal text-gray-300 price-interval">/mo</span>
              </div>
            </div>
            <div class="text-sm text-gray-300">Best for production apps & freelancers</div>
          </div>
          
          <div class="mb-6">
            <h5 class="text-xs font-bold uppercase tracking-wide text-blue-400 mb-3">Server Specs</h5>
            <ul class="space-y-2 text-sm">
              <li class="flex justify-between"><span class="text-gray-400">RAM</span><span class="text-white font-medium">2 GB</span></li>
              <li class="flex justify-between"><span class="text-gray-400">CPU</span><span class="text-white font-medium">2 vCPUs</span></li>
              <li class="flex justify-between"><span class="text-gray-400">Storage</span><span class="text-white font-medium">60 GB NVMe SSD</span></li>
              <li class="flex justify-between"><span class="text-gray-400">Bandwidth</span><span class="text-white font-medium">3 TB/mo</span></li>
              <li class="flex justify-between"><span class="text-gray-400">Sites</span><span class="text-white font-medium">5 sites</span></li>
            </ul>
          </div>
          
          <div class="mb-6">
            <h5 class="text-xs font-bold uppercase tracking-wide text-blue-400 mb-3">Everything in Basic, plus:</h5>
            <ul class="space-y-2 text-sm text-gray-300">
              <li class="flex items-center gap-2"><span class="text-green-400">✓</span> Full SSH & root access</li>
              <li class="flex items-center gap-2"><span class="text-green-400">✓</span> One-click Git deployment</li>
              <li class="flex items-center gap-2"><span class="text-green-400">✓</span> One-click database (Postgres/MongoDB)</li>
              <li class="flex items-center gap-2"><span class="text-green-400">✓</span> Custom domains + free SSL</li>
              <li class="flex items-center gap-2"><span class="text-green-400">✓</span> Deployment history & logs</li>
              <li class="flex items-center gap-2"><span class="text-green-400">✓</span> Server controls (start/stop/restart)</li>
              <li class="flex items-center gap-2"><span class="text-blue-400 font-bold">★</span> <span class="text-blue-300">Weekly automated backups</span></li>
              <li class="flex items-center gap-2"><span class="text-blue-400 font-bold">★</span> <span class="text-blue-300">Direct developer support (12hr)</span></li>
            </ul>
          </div>
          
          <a href="/pay?plan=pro&interval=monthly" class="plan-cta block w-full px-6 py-3 bg-blue-600 text-white text-center font-bold rounded hover:bg-blue-500 hover:scale-105 hover:shadow-[0_0_30px_rgba(0,102,255,0.6)] transition-all uppercase tracking-wider text-sm" data-plan="pro">Select Pro</a>
        </div>
        
        <!-- PREMIUM -->
        <div class="bg-gray-900 border border-gray-700 rounded-lg p-8 hover:border-blue-500/50 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)] transition-all duration-300">
          <div class="border-b border-blue-400/20 pb-6 mb-6">
            <div class="text-xl font-bold text-white mb-2">Premium</div>
            <div class="flex items-baseline gap-2 mb-2">
              <div class="pricing-amount" data-monthly="75" data-yearly="810">
                <span class="text-4xl font-extrabold text-blue-300 price-value">$75</span>
                <span class="text-base font-normal text-gray-300 price-interval">/mo</span>
              </div>
            </div>
            <div class="text-sm text-gray-300">For agencies & high-traffic apps</div>
          </div>
          
          <div class="mb-6">
            <h5 class="text-xs font-bold uppercase tracking-wide text-blue-400 mb-3">Server Specs</h5>
            <ul class="space-y-2 text-sm">
              <li class="flex justify-between"><span class="text-gray-400">RAM</span><span class="text-white font-medium">4 GB</span></li>
              <li class="flex justify-between"><span class="text-gray-400">CPU</span><span class="text-white font-medium">2 vCPUs</span></li>
              <li class="flex justify-between"><span class="text-gray-400">Storage</span><span class="text-white font-medium">80 GB NVMe SSD</span></li>
              <li class="flex justify-between"><span class="text-gray-400">Bandwidth</span><span class="text-white font-medium">4 TB/mo</span></li>
              <li class="flex justify-between"><span class="text-gray-400">Sites</span><span class="text-white font-medium">10 sites</span></li>
            </ul>
          </div>
          
          <div class="mb-6">
            <h5 class="text-xs font-bold uppercase tracking-wide text-blue-400 mb-3">Everything in Pro, plus:</h5>
            <ul class="space-y-2 text-sm text-gray-300">
              <li class="flex items-center gap-2"><span class="text-green-400">✓</span> Full SSH & root access</li>
              <li class="flex items-center gap-2"><span class="text-green-400">✓</span> One-click Git deployment</li>
              <li class="flex items-center gap-2"><span class="text-green-400">✓</span> One-click database (Postgres/MongoDB)</li>
              <li class="flex items-center gap-2"><span class="text-green-400">✓</span> Custom domains + free SSL</li>
              <li class="flex items-center gap-2"><span class="text-green-400">✓</span> Deployment history & logs</li>
              <li class="flex items-center gap-2"><span class="text-green-400">✓</span> Server controls (start/stop/restart)</li>
              <li class="flex items-center gap-2"><span class="text-green-400">✓</span> Weekly automated backups</li>
              <li class="flex items-center gap-2"><span class="text-purple-400 font-bold">★</span> <span class="text-purple-300 font-semibold">Direct access to developer support</span></li>
              <li class="flex items-center gap-2"><span class="text-purple-400 font-bold">★</span> <span class="text-purple-300">2x the RAM for heavy workloads</span></li>
            </ul>
          </div>
          
          <a href="/pay?plan=premium&interval=monthly" class="plan-cta block w-full px-6 py-3 bg-transparent border border-blue-500 text-blue-400 text-center font-medium rounded hover:bg-blue-600 hover:text-white hover:scale-105 hover:shadow-[0_0_30px_rgba(0,102,255,0.6)] transition-all uppercase tracking-wider text-sm" data-plan="premium">Select Premium</a>
        </div>
      </section>
      
      <!-- Feature Comparison Table -->
      <section class="max-w-4xl mx-auto px-8 md:px-12 lg:px-16 pb-16">
        <h2 class="text-2xl font-bold text-white text-center mb-8">Full Feature Comparison</h2>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-700">
                <th class="text-left py-3 px-4 text-gray-400 font-medium">Feature</th>
                <th class="text-center py-3 px-4 text-gray-300 font-bold">Basic</th>
                <th class="text-center py-3 px-4 text-blue-300 font-bold">Pro</th>
                <th class="text-center py-3 px-4 text-purple-300 font-bold">Premium</th>
              </tr>
            </thead>
            <tbody class="text-gray-300">
              <tr class="border-b border-gray-800"><td class="py-3 px-4">RAM</td><td class="text-center">1 GB</td><td class="text-center">2 GB</td><td class="text-center">4 GB</td></tr>
              <tr class="border-b border-gray-800"><td class="py-3 px-4">vCPUs</td><td class="text-center">1</td><td class="text-center">2</td><td class="text-center">2</td></tr>
              <tr class="border-b border-gray-800"><td class="py-3 px-4">NVMe SSD Storage</td><td class="text-center">25 GB</td><td class="text-center">60 GB</td><td class="text-center">80 GB</td></tr>
              <tr class="border-b border-gray-800"><td class="py-3 px-4">Monthly Bandwidth</td><td class="text-center">1 TB</td><td class="text-center">3 TB</td><td class="text-center">4 TB</td></tr>
              <tr class="border-b border-gray-800"><td class="py-3 px-4">Sites/Projects</td><td class="text-center">2</td><td class="text-center">5</td><td class="text-center">10</td></tr>
              <tr class="border-b border-gray-800"><td class="py-3 px-4">SSH & Root Access</td><td class="text-center text-green-400">✓</td><td class="text-center text-green-400">✓</td><td class="text-center text-green-400">✓</td></tr>
              <tr class="border-b border-gray-800"><td class="py-3 px-4">Git Deployment</td><td class="text-center text-green-400">✓</td><td class="text-center text-green-400">✓</td><td class="text-center text-green-400">✓</td></tr>
              <tr class="border-b border-gray-800"><td class="py-3 px-4">One-Click Database</td><td class="text-center text-green-400">✓</td><td class="text-center text-green-400">✓</td><td class="text-center text-green-400">✓</td></tr>
              <tr class="border-b border-gray-800"><td class="py-3 px-4">Custom Domains</td><td class="text-center text-green-400">✓</td><td class="text-center text-green-400">✓</td><td class="text-center text-green-400">✓</td></tr>
              <tr class="border-b border-gray-800"><td class="py-3 px-4">Free SSL (Let's Encrypt)</td><td class="text-center text-green-400">✓</td><td class="text-center text-green-400">✓</td><td class="text-center text-green-400">✓</td></tr>
              <tr class="border-b border-gray-800"><td class="py-3 px-4">Server Controls</td><td class="text-center text-green-400">✓</td><td class="text-center text-green-400">✓</td><td class="text-center text-green-400">✓</td></tr>
              <tr class="border-b border-gray-800"><td class="py-3 px-4">Weekly Automated Backups</td><td class="text-center text-red-400">✗</td><td class="text-center text-green-400">✓</td><td class="text-center text-green-400">✓</td></tr>
              <tr class="border-b border-gray-800"><td class="py-3 px-4">Developer Support</td><td class="text-center">Email (24-48hr)</td><td class="text-center text-blue-300">Email (12-24hr)</td><td class="text-center text-purple-300 font-semibold">Direct Access</td></tr>
              <tr class="border-b border-gray-800"><td class="py-3 px-4">Debug & Config Help</td><td class="text-center text-green-400">✓</td><td class="text-center text-green-400">✓</td><td class="text-center text-green-400">✓</td></tr>
            </tbody>
          </table>
        </div>
      </section>
      
      <!-- Tech Stack Info -->
      <section class="max-w-4xl mx-auto px-8 md:px-12 lg:px-16 pb-16">
        <h2 class="text-2xl font-bold text-white text-center mb-8">What's Pre-Installed</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div class="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <div class="text-2xl mb-2">🐧</div>
            <div class="text-white font-medium text-sm">Ubuntu 22.04</div>
            <div class="text-gray-500 text-xs">LTS</div>
          </div>
          <div class="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <div class="text-2xl mb-2">🟢</div>
            <div class="text-white font-medium text-sm">Node.js 20</div>
            <div class="text-gray-500 text-xs">+ nvm</div>
          </div>
          <div class="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <div class="text-2xl mb-2">🌐</div>
            <div class="text-white font-medium text-sm">Nginx</div>
            <div class="text-gray-500 text-xs">Web server</div>
          </div>
          <div class="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <div class="text-2xl mb-2">🔒</div>
            <div class="text-white font-medium text-sm">Certbot</div>
            <div class="text-gray-500 text-xs">Free SSL</div>
          </div>
          <div class="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <div class="text-2xl mb-2">🐍</div>
            <div class="text-white font-medium text-sm">Python 3</div>
            <div class="text-gray-500 text-xs">+ pip</div>
          </div>
          <div class="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <div class="text-2xl mb-2">🦀</div>
            <div class="text-white font-medium text-sm">Rust</div>
            <div class="text-gray-500 text-xs">cargo</div>
          </div>
          <div class="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <div class="text-2xl mb-2">🐹</div>
            <div class="text-white font-medium text-sm">Go 1.21</div>
            <div class="text-gray-500 text-xs">golang</div>
          </div>
          <div class="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <div class="text-2xl mb-2">🔥</div>
            <div class="text-white font-medium text-sm">UFW Firewall</div>
            <div class="text-gray-500 text-xs">Configured</div>
          </div>
        </div>
      </section>
      
      <!-- Trust Link -->
      <section class="max-w-6xl mx-auto px-8 md:px-12 lg:px-16 pb-12 text-center">
        <p class="text-sm text-gray-400">
          Questions about security or how this works? 
          <a href="/is-this-safe" class="text-brand hover:text-cyan-400 underline font-medium ml-1">Is Clouded Basement safe?</a>
        </p>
      </section>
    </main>
    
    ${getFooter()}
    ${getScripts('nav.js', 'pricing.js')}
  `);
};
