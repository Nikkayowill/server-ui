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
      
      <section class="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- BASIC -->
          <div class="flex flex-col bg-gray-900/50 border border-gray-700 rounded-xl p-6 hover:border-blue-500/50 transition-all">
            <div class="mb-6">
              <div class="text-lg font-bold text-white mb-1">Basic</div>
              <div class="text-gray-400 text-sm">Side projects & learning</div>
            </div>
            
            <div class="mb-6">
              <div class="pricing-amount" data-monthly="15" data-yearly="162">
                <span class="text-4xl font-bold text-white price-value">$15</span>
                <span class="text-gray-400 price-interval">/mo</span>
              </div>
            </div>
            
            <div class="space-y-3 text-sm mb-6 flex-1">
              <div class="flex justify-between"><span class="text-gray-400">RAM</span><span class="text-white">1 GB</span></div>
              <div class="flex justify-between"><span class="text-gray-400">CPU</span><span class="text-white">1 vCPU</span></div>
              <div class="flex justify-between"><span class="text-gray-400">Storage</span><span class="text-white">25 GB SSD</span></div>
              <div class="flex justify-between"><span class="text-gray-400">Bandwidth</span><span class="text-white">1 TB/mo</span></div>
              <div class="flex justify-between"><span class="text-gray-400">Sites</span><span class="text-white">2</span></div>
              <div class="flex justify-between"><span class="text-gray-400">Support</span><span class="text-white">Email</span></div>
            </div>
            
            <a href="/pay?plan=basic&interval=monthly" class="plan-cta block w-full py-3 border border-gray-600 text-gray-300 text-center font-medium rounded-lg hover:bg-gray-800 hover:border-gray-500 transition-all" data-plan="basic">Get Started</a>
          </div>
          
          <!-- PRO -->
          <div class="flex flex-col bg-gray-900/80 border-2 border-blue-500 rounded-xl p-6 relative shadow-[0_0_30px_rgba(59,130,246,0.15)]">
            <div class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full">MOST POPULAR</div>
            
            <div class="mb-6">
              <div class="text-lg font-bold text-white mb-1">Pro</div>
              <div class="text-gray-400 text-sm">Production apps & freelancers</div>
            </div>
            
            <div class="mb-6">
              <div class="pricing-amount" data-monthly="35" data-yearly="378">
                <span class="text-4xl font-bold text-white price-value">$35</span>
                <span class="text-gray-400 price-interval">/mo</span>
              </div>
            </div>
            
            <div class="space-y-3 text-sm mb-6 flex-1">
              <div class="flex justify-between"><span class="text-gray-400">RAM</span><span class="text-white">2 GB</span></div>
              <div class="flex justify-between"><span class="text-gray-400">CPU</span><span class="text-white">2 vCPUs</span></div>
              <div class="flex justify-between"><span class="text-gray-400">Storage</span><span class="text-white">60 GB SSD</span></div>
              <div class="flex justify-between"><span class="text-gray-400">Bandwidth</span><span class="text-white">3 TB/mo</span></div>
              <div class="flex justify-between"><span class="text-gray-400">Sites</span><span class="text-white">5</span></div>
              <div class="flex justify-between"><span class="text-gray-400">Support</span><span class="text-blue-400">Priority (12hr)</span></div>
              <div class="flex justify-between"><span class="text-gray-400">Backups</span><span class="text-blue-400">Weekly</span></div>
            </div>
            
            <a href="/pay?plan=pro&interval=monthly" class="plan-cta block w-full py-3 bg-blue-600 text-white text-center font-bold rounded-lg hover:bg-blue-500 transition-all" data-plan="pro">Get Started</a>
          </div>
          
          <!-- PREMIUM -->
          <div class="flex flex-col bg-gray-900/50 border border-gray-700 rounded-xl p-6 hover:border-purple-500/50 transition-all">
            <div class="mb-6">
              <div class="text-lg font-bold text-white mb-1">Premium</div>
              <div class="text-gray-400 text-sm">Agencies & high-traffic</div>
            </div>
            
            <div class="mb-6">
              <div class="pricing-amount" data-monthly="75" data-yearly="810">
                <span class="text-4xl font-bold text-white price-value">$75</span>
                <span class="text-gray-400 price-interval">/mo</span>
              </div>
            </div>
            
            <div class="space-y-3 text-sm mb-6 flex-1">
              <div class="flex justify-between"><span class="text-gray-400">RAM</span><span class="text-white">4 GB</span></div>
              <div class="flex justify-between"><span class="text-gray-400">CPU</span><span class="text-white">2 vCPUs</span></div>
              <div class="flex justify-between"><span class="text-gray-400">Storage</span><span class="text-white">80 GB SSD</span></div>
              <div class="flex justify-between"><span class="text-gray-400">Bandwidth</span><span class="text-white">4 TB/mo</span></div>
              <div class="flex justify-between"><span class="text-gray-400">Sites</span><span class="text-white">10</span></div>
              <div class="flex justify-between"><span class="text-gray-400">Support</span><span class="text-purple-400">Direct access</span></div>
              <div class="flex justify-between"><span class="text-gray-400">Backups</span><span class="text-purple-400">Weekly</span></div>
            </div>
            
            <a href="/pay?plan=premium&interval=monthly" class="plan-cta block w-full py-3 border border-gray-600 text-gray-300 text-center font-medium rounded-lg hover:bg-gray-800 hover:border-gray-500 transition-all" data-plan="premium">Get Started</a>
          </div>
        </div>
      </section>
      
      <!-- What's Included (collapsed by default) -->
      <section class="max-w-4xl mx-auto px-4 sm:px-6 pb-16">
        <details class="group">
          <summary class="flex items-center justify-center gap-2 cursor-pointer text-gray-400 hover:text-white transition-colors py-4">
            <span class="text-sm font-medium">View full feature comparison</span>
            <svg class="w-4 h-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          </summary>
          <div class="overflow-x-auto mt-6">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-700">
                  <th class="text-left py-3 px-4 text-gray-400 font-medium">Feature</th>
                  <th class="text-center py-3 px-4 text-gray-300">Basic</th>
                  <th class="text-center py-3 px-4 text-blue-400">Pro</th>
                  <th class="text-center py-3 px-4 text-purple-400">Premium</th>
                </tr>
              </thead>
              <tbody class="text-gray-300">
                <tr class="border-b border-gray-800"><td class="py-2 px-4">SSH & Root Access</td><td class="text-center text-green-400">✓</td><td class="text-center text-green-400">✓</td><td class="text-center text-green-400">✓</td></tr>
                <tr class="border-b border-gray-800"><td class="py-2 px-4">Git Deployment</td><td class="text-center text-green-400">✓</td><td class="text-center text-green-400">✓</td><td class="text-center text-green-400">✓</td></tr>
                <tr class="border-b border-gray-800"><td class="py-2 px-4">GitHub Auto-Deploy</td><td class="text-center text-green-400">✓</td><td class="text-center text-green-400">✓</td><td class="text-center text-green-400">✓</td></tr>
                <tr class="border-b border-gray-800"><td class="py-2 px-4">One-Click Database</td><td class="text-center text-green-400">✓</td><td class="text-center text-green-400">✓</td><td class="text-center text-green-400">✓</td></tr>
                <tr class="border-b border-gray-800"><td class="py-2 px-4">Custom Domains</td><td class="text-center text-green-400">✓</td><td class="text-center text-green-400">✓</td><td class="text-center text-green-400">✓</td></tr>
                <tr class="border-b border-gray-800"><td class="py-2 px-4">Automatic SSL</td><td class="text-center text-green-400">✓</td><td class="text-center text-green-400">✓</td><td class="text-center text-green-400">✓</td></tr>
                <tr class="border-b border-gray-800"><td class="py-2 px-4">Free Subdomain</td><td class="text-center text-green-400">✓</td><td class="text-center text-green-400">✓</td><td class="text-center text-green-400">✓</td></tr>
                <tr class="border-b border-gray-800"><td class="py-2 px-4">Environment Variables</td><td class="text-center text-green-400">✓</td><td class="text-center text-green-400">✓</td><td class="text-center text-green-400">✓</td></tr>
                <tr class="border-b border-gray-800"><td class="py-2 px-4">Managed Security Updates</td><td class="text-center text-green-400">✓</td><td class="text-center text-green-400">✓</td><td class="text-center text-green-400">✓</td></tr>
                <tr class="border-b border-gray-800"><td class="py-2 px-4">Weekly Backups</td><td class="text-center text-gray-500">—</td><td class="text-center text-green-400">✓</td><td class="text-center text-green-400">✓</td></tr>
                <tr class="border-b border-gray-800"><td class="py-2 px-4">Priority Support</td><td class="text-center text-gray-500">—</td><td class="text-center text-green-400">✓</td><td class="text-center text-green-400">✓</td></tr>
                <tr><td class="py-2 px-4">Direct Developer Access</td><td class="text-center text-gray-500">—</td><td class="text-center text-gray-500">—</td><td class="text-center text-green-400">✓</td></tr>
              </tbody>
            </table>
          </div>
        </details>
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
      
      <!-- Trust Links -->
      <section class="max-w-3xl mx-auto px-4 sm:px-6 pb-12 text-center">
        <p class="text-gray-400 text-sm mb-4">Questions about security or how this works?</p>
        <div class="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
          <a href="/is-this-safe" class="text-brand hover:text-cyan-400 underline font-medium text-sm">Is Clouded Basement safe?</a>
          <span class="hidden sm:inline text-gray-600">·</span>
          <a href="/compare" class="text-brand hover:text-cyan-400 underline font-medium text-sm">See how we compare</a>
        </div>
      </section>
    </main>
    
    ${getFooter()}
    ${getScripts('nav.js', 'pricing.js')}
  `);
};
