const { getHTMLHead, getScripts, getResponsiveNav } = require('../../helpers');

exports.showHome = async (req, res) => {
  const flashMessage = req.session.flashMessage;
  delete req.session.flashMessage;
  
  res.send(`
${getHTMLHead('Clouded Basement Hosting - Fast, Simple Cloud Hosting')}
    ${getResponsiveNav(req)}
    
    ${flashMessage ? `
    <div class="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 p-4 mb-4 text-sm text-cyan-400 bg-gray-800 border border-cyan-500/30 rounded-lg shadow-lg" role="alert">
      ${flashMessage}
    </div>
    ` : ''}
    
    <!-- Hero Section with Animated Rainbow Stripes -->
    <section class="hero-wrapper relative min-h-screen flex items-center justify-center pt-32 pb-16">
      <!-- Animated rainbow stripe background -->
      <div class="hero-stripes"></div>
      
      <div class="max-w-3xl px-4 sm:px-6 mx-auto text-center relative z-20 hero-content">
        <!-- Hero Heading -->
        <div class="relative inline-block mb-6 z-30">
          <h1 class="hero-title text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15] px-4 py-4">
            <span class="whitespace-nowrap">Ship Without Getting Stuck</span><br>
            <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">On Infrastructure.</span>
          </h1>
        </div>
        
        <p class="mb-8 text-base lg:text-lg font-normal text-gray-400 max-w-2xl mx-auto relative z-30">Clouded Basement gives you a ready-to-use environment so you can focus on building, deploying, and moving fast — not configuring servers.</p>
        <div class="flex flex-col mb-4 space-y-4 sm:flex-row sm:justify-center sm:space-y-0 sm:space-x-4">
          <a href="/register" class="inline-flex justify-center items-center py-3 px-5 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-500 hover:scale-105 hover:shadow-[0_0_30px_rgba(0,102,255,0.6)] transition-all duration-300">
            Try for free
            <svg class="ml-2 w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"></path>
            </svg>
          </a>
          <a href="/docs" class="inline-flex justify-center items-center py-3 px-5 text-base font-medium text-gray-300 border border-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-500/10 hover:text-white transition-all duration-300">
            See how it works
          </a>
        </div>
        <p class="text-sm text-gray-500 mt-6">
          Production-ready in 2 minutes · Full root SSH · No lock-in
          <a href="/is-this-safe" class="text-brand hover:text-cyan-400 underline ml-2">Is this safe? →</a>
        </p>
      </div>
    </section>

    <!-- Social Proof / Trust Indicators -->
    <section class="py-8 md:py-12">
      <div class="max-w-3xl mx-auto px-4 sm:px-6">
        <div class="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 md:gap-12 text-sm text-gray-400">
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
            <span>Your own VPS (not shared)</span>
          </div>
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
            <span>Cancel anytime</span>
          </div>
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
            <span>Founder support</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Why Choose Section -->
    <section class="py-16 md:py-24 relative">
      <div class="max-w-3xl mx-auto px-4 sm:px-6">
        <div class="text-center mb-12">
          <h2 class="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">Why Choose Clouded Basement?</h2>
          <p class="text-gray-400 max-w-md mx-auto">Control and convenience — not one or the other.</p>
        </div>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <!-- Card 1 -->
          <div class="p-5 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-blue-500/30 transition-colors">
            <div class="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
              <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"/>
              </svg>
            </div>
            <h3 class="text-base font-medium text-white mb-2">Your server, not a black box</h3>
            <p class="text-gray-400 text-sm leading-relaxed">Every project runs on its own VPS with full root access. No abstractions, no vendor lock-in.</p>
          </div>
          
          <!-- Card 2 -->
          <div class="p-5 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-blue-500/30 transition-colors">
            <div class="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center mb-4">
              <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
            </div>
            <h3 class="text-base font-medium text-white mb-2">Zero-setup infrastructure</h3>
            <p class="text-gray-400 text-sm leading-relaxed">SSL, Nginx, Node.js, Python, Git — all configured and ready in minutes.</p>
          </div>
          
          <!-- Card 3 -->
          <div class="p-5 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-blue-500/30 transition-colors">
            <div class="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
              <svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
            </div>
            <h3 class="text-base font-medium text-white mb-2">Founder support</h3>
            <p class="text-gray-400 text-sm leading-relaxed">Every ticket is reviewed by the founder. Real answers from someone who knows the system.</p>
          </div>
          
          <!-- Card 4 -->
          <div class="p-5 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-blue-500/30 transition-colors">
            <div class="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-4">
              <svg class="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h3 class="text-base font-medium text-white mb-2">Simple, predictable pricing</h3>
            <p class="text-gray-400 text-sm leading-relaxed">Flat monthly pricing. Cancel anytime. No usage surprises or complicated tiers.</p>
          </div>
          
          <!-- Card 5 -->
          <div class="p-5 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-blue-500/30 transition-colors">
            <div class="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center mb-4">
              <svg class="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
            </div>
            <h3 class="text-base font-medium text-white mb-2">No vendor lock-in</h3>
            <p class="text-gray-400 text-sm leading-relaxed">Your server, your data, your code. Take it anywhere, anytime. We don't trap you.</p>
          </div>
          
          <!-- Card 6 -->
          <div class="p-5 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-blue-500/30 transition-colors">
            <div class="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center mb-4">
              <svg class="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h3 class="text-base font-medium text-white mb-2">Ready in 2 minutes</h3>
            <p class="text-gray-400 text-sm leading-relaxed">From signup to live server. No waiting, no manual provisioning, no delays.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- How It Works Section -->
    <section class="py-16 md:py-24 relative">
      <div class="max-w-3xl mx-auto px-4 sm:px-6">
        <div class="text-center mb-12">
          <h2 class="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">How It Works</h2>
          <p class="text-gray-400 max-w-md mx-auto">From idea to live server — without the setup stress</p>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <!-- Step 1 -->
          <div class="p-5 rounded-xl bg-gray-900/30 border border-gray-800">
            <div class="flex items-center gap-3 mb-3">
              <span class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 text-sm font-bold">1</span>
              <h3 class="text-base font-medium text-white">Choose a plan</h3>
            </div>
            <p class="text-gray-400 text-sm leading-relaxed">Pick the resources you need. No hidden configs, no surprise limits.</p>
          </div>
          
          <!-- Step 2 -->
          <div class="p-5 rounded-xl bg-gray-900/30 border border-gray-800">
            <div class="flex items-center gap-3 mb-3">
              <span class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 text-sm font-bold">2</span>
              <h3 class="text-base font-medium text-white">We prepare everything</h3>
            </div>
            <p class="text-gray-400 text-sm leading-relaxed">We provision Ubuntu with Nginx, Node, Python, and SSL — ready in 2 minutes.</p>
          </div>
          
          <!-- Step 3 -->
          <div class="p-5 rounded-xl bg-gray-900/30 border border-gray-800">
            <div class="flex items-center gap-3 mb-3">
              <span class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 text-sm font-bold">3</span>
              <h3 class="text-base font-medium text-white">Deploy your way</h3>
            </div>
            <p class="text-gray-400 text-sm leading-relaxed">SSH in like a normal VPS, or deploy directly from GitHub with one click.</p>
          </div>
        </div>
        
        <p class="mt-10 text-center text-gray-500 text-sm">Every server is isolated, yours alone, and can be accessed or moved at any time.</p>
      </div>
    </section>

    <!-- What You Get Section -->
    <section class="py-16 md:py-24 relative">
      <div class="max-w-3xl mx-auto px-4 sm:px-6">
        <div class="text-center mb-12">
          <h2 class="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">What you get</h2>
          <p class="text-gray-400 max-w-md mx-auto">Everything to run a production app — without managing infrastructure.</p>
        </div>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div class="p-4 rounded-xl bg-gray-900/50 border border-gray-800">
            <div class="flex items-start gap-3">
              <span class="text-green-400 mt-0.5">✓</span>
              <div>
                <h4 class="text-white font-medium mb-1">Dedicated VPS</h4>
                <p class="text-gray-500 text-sm">Your own isolated server</p>
              </div>
            </div>
          </div>
          
          <div class="p-4 rounded-xl bg-gray-900/50 border border-gray-800">
            <div class="flex items-start gap-3">
              <span class="text-green-400 mt-0.5">✓</span>
              <div>
                <h4 class="text-white font-medium mb-1">Ubuntu 22.04 LTS</h4>
                <p class="text-gray-500 text-sm">Latest stable release</p>
              </div>
            </div>
          </div>
          
          <div class="p-4 rounded-xl bg-gray-900/50 border border-gray-800">
            <div class="flex items-start gap-3">
              <span class="text-green-400 mt-0.5">✓</span>
              <div>
                <h4 class="text-white font-medium mb-1">Full root SSH</h4>
                <p class="text-gray-500 text-sm">Complete server control</p>
              </div>
            </div>
          </div>
          
          <div class="p-4 rounded-xl bg-gray-900/50 border border-gray-800">
            <div class="flex items-start gap-3">
              <span class="text-green-400 mt-0.5">✓</span>
              <div>
                <h4 class="text-white font-medium mb-1">Nginx preconfigured</h4>
                <p class="text-gray-500 text-sm">Ready to serve apps</p>
              </div>
            </div>
          </div>
          
          <div class="p-4 rounded-xl bg-gray-900/50 border border-gray-800">
            <div class="flex items-start gap-3">
              <span class="text-green-400 mt-0.5">✓</span>
              <div>
                <h4 class="text-white font-medium mb-1">Node.js & Python</h4>
                <p class="text-gray-500 text-sm">Modern runtimes installed</p>
              </div>
            </div>
          </div>
          
          <div class="p-4 rounded-xl bg-gray-900/50 border border-gray-800">
            <div class="flex items-start gap-3">
              <span class="text-green-400 mt-0.5">✓</span>
              <div>
                <h4 class="text-white font-medium mb-1">GitHub deployments</h4>
                <p class="text-gray-500 text-sm">One-click from repo</p>
              </div>
            </div>
          </div>
          
          <div class="p-4 rounded-xl bg-gray-900/50 border border-gray-800 sm:col-span-2 lg:col-span-1">
            <div class="flex items-start gap-3">
              <span class="text-green-400 mt-0.5">✓</span>
              <div>
                <h4 class="text-white font-medium mb-1">Custom domains + Free SSL</h4>
                <p class="text-gray-500 text-sm">HTTPS via Let's Encrypt</p>
              </div>
            </div>
          </div>
          
          <div class="p-4 rounded-xl bg-gray-900/50 border border-gray-800 sm:col-span-2 lg:col-span-2">
            <div class="flex items-start gap-3">
              <span class="text-green-400 mt-0.5">✓</span>
              <div>
                <h4 class="text-white font-medium mb-1">Secure by default</h4>
                <p class="text-gray-500 text-sm">Hardened security settings out of the box</p>
              </div>
            </div>
          </div>
        </div>
        
        <p class="text-center text-gray-500 text-sm mt-10">Install anything else you need — it's your server.</p>
      </div>
    </section>

    <!-- How We Compare Section -->
    <section class="py-16 md:py-24 relative">
      <div class="max-w-3xl mx-auto px-4 sm:px-6">
        <div class="text-center mb-12">
          <h2 class="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">How We Compare</h2>
          <p class="text-gray-400 max-w-md mx-auto">The convenience of a PaaS with the control of your own server.</p>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <!-- PaaS Column -->
          <div class="p-5 rounded-xl bg-gray-900/50 border border-gray-800">
            <h3 class="text-base font-bold text-gray-300 mb-1">PaaS</h3>
            <p class="text-xs text-gray-500 mb-4">Heroku · Render · Railway</p>
            <ul class="space-y-2 text-sm text-gray-400">
              <li class="flex items-start gap-2"><span class="text-green-400">✓</span> Quick setup</li>
              <li class="flex items-start gap-2"><span class="text-green-400">✓</span> Git deployments</li>
              <li class="flex items-start gap-2"><span class="text-red-400">✗</span> No SSH or root access</li>
              <li class="flex items-start gap-2"><span class="text-red-400">✗</span> Shared containers</li>
              <li class="flex items-start gap-2"><span class="text-red-400">✗</span> Ephemeral filesystem</li>
              <li class="flex items-start gap-2"><span class="text-red-400">✗</span> Vendor lock-in</li>
            </ul>
            <p class="text-xs text-gray-500 mt-4">From $5–25/mo per service</p>
          </div>
          
          <!-- Basement Column (highlighted) -->
          <div class="p-5 rounded-xl bg-gray-900/50 border border-blue-500/50 relative">
            <span class="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 text-[10px] font-medium text-white bg-blue-600 rounded">BEST OF BOTH</span>
            <h3 class="text-base font-bold text-blue-400 mb-1">Clouded Basement</h3>
            <p class="text-xs text-gray-500 mb-4">Managed VPS hosting</p>
            <ul class="space-y-2 text-sm text-gray-300">
              <li class="flex items-start gap-2"><span class="text-green-400">✓</span> Quick setup (~2 min)</li>
              <li class="flex items-start gap-2"><span class="text-green-400">✓</span> Git deployments</li>
              <li class="flex items-start gap-2"><span class="text-green-400">✓</span> Full SSH & root access</li>
              <li class="flex items-start gap-2"><span class="text-green-400">✓</span> Dedicated VPS (not shared)</li>
              <li class="flex items-start gap-2"><span class="text-green-400">✓</span> Persistent filesystem</li>
              <li class="flex items-start gap-2"><span class="text-green-400">✓</span> No lock-in — take it and go</li>
            </ul>
            <p class="text-xs text-gray-500 mt-4">From $15/mo flat</p>
          </div>
          
          <!-- DIY VPS Column -->
          <div class="p-5 rounded-xl bg-gray-900/50 border border-gray-800">
            <h3 class="text-base font-bold text-gray-300 mb-1">DIY VPS</h3>
            <p class="text-xs text-gray-500 mb-4">DigitalOcean · Linode · Vultr</p>
            <ul class="space-y-2 text-sm text-gray-400">
              <li class="flex items-start gap-2"><span class="text-green-400">✓</span> Full SSH & root access</li>
              <li class="flex items-start gap-2"><span class="text-green-400">✓</span> Dedicated server</li>
              <li class="flex items-start gap-2"><span class="text-red-400">✗</span> No managed deployments</li>
              <li class="flex items-start gap-2"><span class="text-red-400">✗</span> Manual SSL & security setup</li>
              <li class="flex items-start gap-2"><span class="text-red-400">✗</span> No dashboard or GUI</li>
              <li class="flex items-start gap-2"><span class="text-red-400">✗</span> 30–60 min setup time</li>
            </ul>
            <p class="text-xs text-gray-500 mt-4">From $4–6/mo + your time</p>
          </div>
        </div>
        
        <p class="text-center text-gray-500 text-sm mt-10">
          <a href="/compare" class="text-blue-400 hover:text-blue-300 underline">See the full comparison with Heroku, Render, and Railway →</a>
        </p>
      </div>
    </section>

    <!-- Pricing Section -->
    <section class="py-16 md:py-24 relative">
      <div class="max-w-3xl mx-auto px-4 sm:px-6">
        <div class="text-center mb-12">
          <h2 class="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">Pricing</h2>
          <p class="text-gray-400 max-w-md mx-auto">Simple monthly pricing · No usage surprises · Cancel anytime</p>
          <p class="text-blue-400 text-sm mt-3">💬 Every plan includes real developer support</p>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <!-- Basic -->
          <div class="relative p-5 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-blue-500/30 transition-colors">
            <div class="flex items-start justify-between mb-2">
              <h3 class="text-lg font-medium text-white">Basic</h3>
              <span class="px-1.5 py-0.5 text-[8px] font-medium text-white rounded bg-red-500 uppercase">3-day trial</span>
            </div>
            <p class="text-3xl font-bold text-white">$15<span class="text-sm font-normal text-gray-500">/mo</span></p>
            <p class="text-gray-500 text-sm mt-3 mb-5">1 GB RAM · 1 vCPU · 25 GB SSD · 2 sites</p>
            <a href="/pay?plan=basic&interval=monthly" class="block w-full py-2 text-center text-sm font-medium rounded border border-blue-500/50 text-blue-400 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all">Deploy Basic</a>
          </div>
          
          <!-- Pro - Featured -->
          <div class="relative p-5 rounded-xl bg-gray-900/50 border border-blue-500/50 hover:border-blue-400 transition-colors">
            <div class="flex items-start justify-between mb-2">
              <h3 class="text-lg font-medium text-white">Pro</h3>
              <span class="px-1.5 py-0.5 text-[8px] font-medium text-white rounded bg-red-500 uppercase">3-day trial</span>
            </div>
            <p class="text-3xl font-bold text-white">$35<span class="text-sm font-normal text-gray-500">/mo</span></p>
            <p class="text-gray-500 text-sm mt-3 mb-5">2 GB RAM · 2 vCPUs · 50 GB SSD · 5 sites</p>
            <a href="/pay?plan=pro&interval=monthly" class="block w-full py-2 text-center text-sm font-medium rounded bg-blue-600 text-white hover:bg-blue-500 transition-all">Deploy Pro</a>
          </div>
          
          <!-- Premium -->
          <div class="relative p-5 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-blue-500/30 transition-colors">
            <div class="flex items-start justify-between mb-2">
              <h3 class="text-lg font-medium text-white">Premium</h3>
              <span class="px-1.5 py-0.5 text-[8px] font-medium text-white rounded bg-red-500 uppercase">3-day trial</span>
            </div>
            <p class="text-3xl font-bold text-white">$75<span class="text-sm font-normal text-gray-500">/mo</span></p>
            <p class="text-gray-500 text-sm mt-3 mb-5">4 GB RAM · 2 vCPUs · 80 GB SSD · 10 sites</p>
            <a href="/pay?plan=premium&interval=monthly" class="block w-full py-2 text-center text-sm font-medium rounded border border-blue-500/50 text-blue-400 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all">Deploy Premium</a>
          </div>
        </div>
        
        <p class="text-center text-gray-500 text-sm mt-10">
          No contracts. Cancel anytime. 
          <a href="/pricing" class="text-blue-400 hover:text-blue-300 underline">Full pricing details →</a>
        </p>
      </div>
    </section>

    <!-- Final CTA Section with Footer -->
    <section class="py-12 md:py-16 relative overflow-hidden">
      <!-- Radial gradient reflection matching hero colors (intensified) -->
      <div class="absolute inset-0 pointer-events-none">
        <div class="absolute inset-0" style="background-image: radial-gradient(circle 600px at 50% 100%, rgba(96, 165, 250, 0.25) 0%, rgba(232, 121, 249, 0.18) 35%, rgba(94, 234, 212, 0.14) 65%, transparent 100%);"></div>
      </div>
      
      <!-- CTA Content -->
      <div class="max-w-xl px-4 sm:px-6 mx-auto text-center relative z-10 mb-20">
        <h2 class="mb-4 text-3xl md:text-4xl font-extrabold text-white">Ready to get started?</h2>
        <p class="mb-8 text-lg text-gray-300">Deploy your server in minutes. No credit card required to explore.</p>
        <p class="mb-8 text-gray-400 text-sm">
          <span class="text-gray-500">Got questions about server ownership or setup?</span>
          Every VPS is yours with full root access, automated provisioning, and one-click deployments.
          <a href="/faq" class="text-brand hover:text-cyan-400 underline ml-1">See the full FAQ →</a>
        </p>
        <a href="/register" class="inline-flex justify-center items-center py-3 px-8 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-500 hover:scale-105 hover:shadow-[0_0_30px_rgba(0,102,255,0.6)] transition-all duration-300">
          Sign up
          <svg class="ml-2 w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"></path>
          </svg>
        </a>
      </div>
      
      <!-- Footer Content -->
      <footer class="relative z-10 py-12">
        <div class="max-w-3xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div class="text-center md:text-left">
                <h3 class="text-blue-400 text-base font-bold mb-4">Basement</h3>
                <p class="text-gray-400 text-sm leading-relaxed">Cloud hosting without the headache. Fast, simple, powerful.</p>
            </div>
            <div class="text-center md:text-left">
                <h4 class="text-blue-400 text-sm font-bold mb-3">Quick Links</h4>
                <ul class="space-y-2">
                    <li><a href="/about" class="text-gray-400 text-sm hover:text-blue-400 transition-colors duration-300">About</a></li>
                    <li><a href="/pricing" class="text-gray-400 text-sm hover:text-blue-400 transition-colors duration-300">Pricing</a></li>
                    <li><a href="/docs" class="text-gray-400 text-sm hover:text-blue-400 transition-colors duration-300">Documentation</a></li>
                    <li><a href="/contact" class="text-gray-400 text-sm hover:text-blue-400 transition-colors duration-300">Contact</a></li>
                    <li><a href="/compare" class="text-gray-400 text-sm hover:text-blue-400 transition-colors duration-300">Compare</a></li>
                    <li><a href="/faq" class="text-gray-400 text-sm hover:text-blue-400 transition-colors duration-300">FAQ</a></li>
                </ul>
            </div>
            <div class="text-center md:text-left">
                <h4 class="text-blue-400 text-sm font-bold mb-3">Legal</h4>
                <ul class="space-y-2">
                    <li><a href="/terms" class="text-gray-400 text-sm hover:text-blue-400 transition-colors duration-300">Terms of Service</a></li>
                    <li><a href="/privacy" class="text-gray-400 text-sm hover:text-blue-400 transition-colors duration-300">Privacy Policy</a></li>
                </ul>
            </div>
        </div>
        <div class="text-center mt-10 pt-6 max-w-3xl mx-auto px-4">
            <p class="mb-3">
                <a href="/is-this-safe" class="text-brand text-base font-medium hover:text-cyan-400 transition-colors duration-300 underline">Is Clouded Basement safe?</a>
            </p>
            <p class="text-gray-500 text-xs">&copy; ${new Date().getFullYear()} Basement. All rights reserved.</p>
        </div>
      </footer>
    </section>
    
    ${getScripts('nav.js')}
  `);
};
