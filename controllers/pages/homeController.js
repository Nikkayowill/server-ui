const { getHTMLHead, getScripts, getResponsiveNav, getFooter } = require('../../helpers');

/**
 * Funnel Homepage — Isolated layout system
 * 
 * Structure: Hero → Problem → Solution → How It Works → Trust (Pricing) → Final CTA → Footer
 * Layout:    funnel.css (self-contained, does not inherit app UI)
 * Width:     --funnel-prose (38rem / ~60ch) for text, --funnel-wide (56rem) for grids
 * Rhythm:    funnel-section provides consistent vertical spacing (4rem mobile, 6rem desktop)
 * 
 * Heading hierarchy: h1 (hero) → h2 (each section) → h3 (cards / steps)
 */
exports.showHome = async (req, res) => {
  const flashMessage = req.session.flashMessage;
  delete req.session.flashMessage;
  
  res.send(`
${getHTMLHead('Clouded Basement — Fast, Simple Cloud Hosting')}
    <link rel="stylesheet" href="/css/funnel.css">
    ${getResponsiveNav(req)}
    
    ${flashMessage ? `
    <div class="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 p-4 text-sm text-cyan-400 bg-gray-800/90 border border-cyan-500/20 rounded-lg shadow-lg" role="alert">
      ${flashMessage}
    </div>
    ` : ''}

    <main class="funnel">

      <!-- ═══════════════════════════════════════
           1. HERO
           Primary value prop · One sentence · Primary CTA
           ═══════════════════════════════════════ -->
      <section class="funnel-hero">
        <div class="hero-stripes"></div>
        <div class="text-center relative z-20">
          <h1 class="funnel-heading-1 mb-6 max-w-3xl mx-auto px-6">
            Ship&nbsp;Without&nbsp;Getting<br>
            <span class="funnel-gradient-text">Stuck&nbsp;on&nbsp;Infrastructure.</span>
          </h1>
          <div class="funnel-prose mx-auto">
            <p class="funnel-body max-w-lg mx-auto mb-10">A ready-to-use server so you can focus<br>on building — not configuring.</p>
            <a href="/register" class="funnel-btn funnel-btn-primary">
              Try 3 Days Free
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
            </a>
              <a href="/docs" class="funnel-btn funnel-btn-secondary">
            Read Docs              
           <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
            </a>
            <p class="mt-8 funnel-body-sm" style="color: #6b7280">
              Push to GitHub, we handle the rest · Live in&nbsp;minutes
            </p>
          </div>
        </div>
      </section>

      <!-- ═══════════════════════════════════════
           2. PROBLEM
           Frame the pain clearly
           ═══════════════════════════════════════ -->
      <section class="funnel-section funnel-bg-problem">
        <div class="funnel-prose text-center">
          <p class="funnel-kicker mb-4 reveal">The Problem</p>
          <h2 class="funnel-heading-2 mb-6 reveal">Every hour on config<br>is an hour not&nbsp;shipping.</h2>
          <p class="funnel-body mx-auto reveal" style="max-width: 36rem">
            You just want to push your code and have it go live. Instead you're stuck configuring Nginx, SSL certificates, firewall rules, and deploy&nbsp;scripts.
          </p>
          <p class="funnel-body mx-auto mt-4 reveal" style="max-width: 36rem">
            That stuff should already be done for&nbsp;you.
          </p>
        </div>
      </section>

      <!-- ═══════════════════════════════════════
           3. SOLUTION
           What Clouded Basement does + dashboard proof
           ═══════════════════════════════════════ -->
      <section class="funnel-section funnel-bg-solution">
        <div class="funnel-wide">

          <header class="funnel-prose text-center mb-12">
            <p class="funnel-kicker mb-4 reveal">The Solution</p>
            <h2 class="funnel-heading-2 mb-4 reveal">So we set it up&nbsp;for&nbsp;you.</h2>
            <p class="funnel-body reveal">Connect your GitHub repo, push your code, and it's live. We handle&nbsp;everything&nbsp;else.</p>
          </header>

          <!-- Dashboard status card — production-grade preview -->
          <div class="mb-14 reveal" style="max-width: 520px; margin-left: auto; margin-right: auto; margin-bottom: 5rem">
              <div style="overflow: hidden; border-radius: 0.75rem; border: 1px solid rgba(100,140,255,0.15); background: #0d0d1a; box-shadow: 0 0 80px 20px rgba(59,130,246,0.12), 0 0 40px 10px rgba(139,92,246,0.08), 0 0 120px 40px rgba(34,211,238,0.06), 0 25px 60px -12px rgba(0,0,0,0.7)">

              <!-- Deploy from Git -->
              <div class="px-5 py-4" style="border-bottom: 1px solid rgba(255,255,255,0.06)">
                <p class="text-xs font-semibold mb-3" style="color: #d1d5db">Deploy from Git</p>
                <div class="flex gap-2">
                  <div class="flex-1 px-3.5 py-2.5 rounded-lg text-xs funnel-mono truncate" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); color: #60a5fa">https://github.com/you/my-saas-app.git</div>
                  <div class="px-4 py-2.5 rounded-lg text-xs font-semibold flex-shrink-0" style="background: #2563eb; color: white">Deploy</div>
                </div>
                <div class="flex items-center gap-2 mt-3">
                  <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" style="background: #22c55e"></span>
                  <span class="text-[10px]" style="color: #6b7280">Auto-deploy enabled</span>
                </div>
              </div>

              <!-- Recent Deployments header -->
              <div class="px-5 pt-4 pb-2">
                <p class="text-xs font-semibold" style="color: #d1d5db">Recent Deployments</p>
              </div>

              <!-- Deployment row 1 — success -->
              <div class="flex items-center justify-between px-5 py-3" style="border-bottom: 1px solid rgba(255,255,255,0.04)">
                <div class="flex items-center gap-3 min-w-0">
                  <span class="flex-shrink-0 text-xs" style="color: #4ade80">\u25cf</span>
                  <div class="min-w-0">
                    <p class="text-sm funnel-mono truncate" style="color: #e5e7eb">my-saas-app</p>
                    <p class="text-[10px]" style="color: #6b7280">2/12/2026</p>
                  </div>
                </div>
                <div class="px-3 py-1.5 rounded-md text-[10px] font-medium flex-shrink-0" style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: #9ca3af">Redeploy</div>
              </div>

              <!-- Deployment row 2 — success -->
              <div class="flex items-center justify-between px-5 py-3" style="border-bottom: 1px solid rgba(255,255,255,0.04)">
                <div class="flex items-center gap-3 min-w-0">
                  <span class="flex-shrink-0 text-xs" style="color: #4ade80">\u25cf</span>
                  <div class="min-w-0">
                    <p class="text-sm funnel-mono truncate" style="color: #e5e7eb">landing-page</p>
                    <p class="text-[10px]" style="color: #6b7280">2/9/2026</p>
                  </div>
                </div>
                <div class="px-3 py-1.5 rounded-md text-[10px] font-medium flex-shrink-0" style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: #9ca3af">Redeploy</div>
              </div>

              <!-- Deployment row 3 — success -->
              <div class="flex items-center justify-between px-5 py-3">
                <div class="flex items-center gap-3 min-w-0">
                  <span class="flex-shrink-0 text-xs" style="color: #4ade80">\u25cf</span>
                  <div class="min-w-0">
                    <p class="text-sm funnel-mono truncate" style="color: #e5e7eb">api-backend</p>
                    <p class="text-[10px]" style="color: #6b7280">2/7/2026</p>
                  </div>
                </div>
                <div class="px-3 py-1.5 rounded-md text-[10px] font-medium flex-shrink-0" style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: #9ca3af">Redeploy</div>
              </div>

            </div>
            <!-- Caption -->
            <p class="text-center mt-6 text-[11px]" style="color: #4b5563">Your deploy dashboard — paste a repo, click deploy</p>
          </div>

          <!-- Feature grid (3×2 → optimized for desktop readability) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-8 reveal-stagger">
            <div class="flex gap-4">
              <div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style="background: rgba(59,130,246,0.08)">
                <svg class="w-[18px] h-[18px]" fill="none" stroke="#60a5fa" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14"/><path stroke-linecap="round" stroke-linejoin="round" d="M7 8V3m0 0L4 6m3-3l3 3m4 5v6m0 0l-3-3m3 3l3-3"/></svg>
              </div>
              <div>
                <h3 class="funnel-heading-3 mb-1">Push to GitHub, it's&nbsp;live</h3>
                <p class="funnel-body-sm">Connect your repo once. Every push auto-deploys — no scripts,&nbsp;no&nbsp;CI.</p>
              </div>
            </div>
            <div class="flex gap-4">
              <div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style="background: rgba(34,197,94,0.08)">
                <svg class="w-[18px] h-[18px]" fill="none" stroke="#4ade80" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              </div>
              <div>
                <h3 class="funnel-heading-3 mb-1">Zero-setup infrastructure</h3>
                <p class="funnel-body-sm">SSL, Nginx, Node.js, Python, Git — configured and ready in&nbsp;minutes.</p>
              </div>
            </div>
            <div class="flex gap-4">
              <div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style="background: rgba(168,85,247,0.08)">
                <svg class="w-[18px] h-[18px]" fill="none" stroke="#a78bfa" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
              </div>
              <div>
                <h3 class="funnel-heading-3 mb-1">Founder support</h3>
                <p class="funnel-body-sm">Every ticket reviewed by the founder. Real answers, not&nbsp;bots.</p>
              </div>
            </div>
            <div class="flex gap-4">
              <div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style="background: rgba(234,179,8,0.08)">
                <svg class="w-[18px] h-[18px]" fill="none" stroke="#facc15" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </div>
              <div>
                <h3 class="funnel-heading-3 mb-1">Flat, predictable pricing</h3>
                <p class="funnel-body-sm">No usage surprises or complicated tiers. Cancel&nbsp;anytime.</p>
              </div>
            </div>
            <div class="flex gap-4">
              <div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style="background: rgba(249,115,22,0.08)">
                <svg class="w-[18px] h-[18px]" fill="none" stroke="#fb923c" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              </div>
              <div>
                <h3 class="funnel-heading-3 mb-1">Full access if you want&nbsp;it</h3>
                <p class="funnel-body-sm">SSH and root access are there when you need them. Most people&nbsp;don't.</p>
              </div>
            </div>
            <div class="flex gap-4">
              <div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style="background: rgba(236,72,153,0.08)">
                <svg class="w-[18px] h-[18px]" fill="none" stroke="#f472b6" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </div>
              <div>
                <h3 class="funnel-heading-3 mb-1">Ready in 2 minutes</h3>
                <p class="funnel-body-sm">From signup to live server. No waiting, no manual&nbsp;provisioning.</p>
              </div>
            </div>
          </div>

        </div>
      </section>

      <!-- ═══════════════════════════════════════
           4. HOW IT WORKS
           Three-step flow
           ═══════════════════════════════════════ -->
      <section class="funnel-section funnel-bg-process">
        <div class="funnel-wide">

          <header class="funnel-prose text-center mb-12">
            <p class="funnel-kicker mb-4 reveal">How It Works</p>
            <h2 class="funnel-heading-2 mb-4 reveal">From idea to live&nbsp;server</h2>
            <p class="funnel-body reveal">Three steps. No DevOps&nbsp;required.</p>
          </header>

          <div class="reveal-stagger">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
              <div class="text-center">
                <p class="font-mono text-xs tracking-widest mb-4 mx-auto" style="color: #4b5563">01</p>
                <h3 class="funnel-heading-3 mb-2">Choose a plan</h3>
                <p class="funnel-body-sm max-w-xs mx-auto">Pick the resources you need. No hidden configs, no surprise&nbsp;limits.</p>
              </div>
              <div class="text-center">
                <p class="font-mono text-xs tracking-widest mb-4 mx-auto" style="color: #4b5563">02</p>
                <h3 class="funnel-heading-3 mb-2">We set up everything</h3>
                <p class="funnel-body-sm max-w-xs mx-auto">Ubuntu with Nginx, Node, Python, and SSL — provisioned in 2&nbsp;minutes.</p>
              </div>
              <div class="text-center">
                <p class="font-mono text-xs tracking-widest mb-4 mx-auto" style="color: #4b5563">03</p>
                <h3 class="funnel-heading-3 mb-2">Push and it's live</h3>
                <p class="funnel-body-sm max-w-xs mx-auto">Connect your GitHub repo. Every push auto-deploys your&nbsp;app.</p>
              </div>
            </div>
          </div>

        </div>
      </section>

      <!-- ═══════════════════════════════════════
           5. TRUST — PRICING
           Transparent pricing = trust signal
           ═══════════════════════════════════════ -->
      <section class="funnel-section funnel-bg-trust">
        <div class="funnel-wide" style="max-width: 52rem">

          <header class="funnel-prose text-center mb-12">
            <p class="funnel-kicker mb-4 reveal">Pricing</p>
            <h2 class="funnel-heading-2 mb-4 reveal">One price. No&nbsp;surprises.</h2>
            <p class="funnel-body reveal">No usage surprises. Cancel anytime. Every plan includes real developer&nbsp;support.</p>
          </header>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch reveal-stagger">

            <!-- Basic -->
            <div class="funnel-card p-6 md:p-7 flex flex-col">
              <h3 class="funnel-heading-3 mb-1">Basic</h3>
              <p class="funnel-body-sm mb-4" style="color: #6b7280">Side projects &amp; experiments</p>
              <p class="text-4xl font-bold text-white mb-1">$15<span class="text-base font-normal" style="color: #6b7280">/mo</span></p>
              <p class="text-xs mb-6" style="color: #4b5563">3-day free trial included</p>
              <ul class="space-y-2 funnel-body-sm mb-8 flex-1">
                <li class="flex items-center gap-2"><span style="color: #4ade80; font-size: 10px">●</span> 1 GB RAM · 1 vCPU</li>
                <li class="flex items-center gap-2"><span style="color: #4ade80; font-size: 10px">●</span> 25 GB SSD</li>
                <li class="flex items-center gap-2"><span style="color: #4ade80; font-size: 10px">●</span> 2 sites</li>
                <li class="flex items-center gap-2"><span style="color: #4ade80; font-size: 10px">●</span> GitHub auto-deploy</li>
              </ul>
              <a href="/pay?plan=basic&interval=monthly" class="funnel-btn funnel-btn-subtle w-full">Deploy Basic</a>
            </div>

            <!-- Pro — featured -->
            <div class="funnel-card-featured p-6 md:p-7 flex flex-col relative md:-my-3">
              <span class="funnel-badge">Most Popular</span>
              <h3 class="funnel-heading-3 mb-1 mt-2">Pro</h3>
              <p class="funnel-body-sm mb-4" style="color: #6b7280">Production apps &amp; growing projects</p>
              <p class="text-4xl font-bold text-white mb-1">$35<span class="text-base font-normal" style="color: #6b7280">/mo</span></p>
              <p class="text-xs mb-6" style="color: #4b5563">3-day free trial included</p>
              <ul class="space-y-2 funnel-body-sm mb-8 flex-1" style="color: #d1d5db">
                <li class="flex items-center gap-2"><span style="color: #4ade80; font-size: 10px">●</span> 2 GB RAM · 2 vCPUs</li>
                <li class="flex items-center gap-2"><span style="color: #4ade80; font-size: 10px">●</span> 50 GB SSD</li>
                <li class="flex items-center gap-2"><span style="color: #4ade80; font-size: 10px">●</span> 5 sites</li>
                <li class="flex items-center gap-2"><span style="color: #4ade80; font-size: 10px">●</span> GitHub auto-deploy</li>
              </ul>
              <a href="/pay?plan=pro&interval=monthly" class="funnel-btn funnel-btn-primary w-full">Deploy Pro</a>
            </div>

            <!-- Premium -->
            <div class="funnel-card p-6 md:p-7 flex flex-col">
              <h3 class="funnel-heading-3 mb-1">Premium</h3>
              <p class="funnel-body-sm mb-4" style="color: #6b7280">Established apps &amp; high&nbsp;traffic</p>
              <p class="text-4xl font-bold text-white mb-1">$55<span class="text-base font-normal" style="color: #6b7280">/mo</span></p>
              <p class="text-xs mb-6" style="color: #4b5563">3-day free trial included</p>
              <ul class="space-y-2 funnel-body-sm mb-8 flex-1">
                <li class="flex items-center gap-2"><span style="color: #4ade80; font-size: 10px">●</span> 4 GB RAM · 2 vCPUs</li>
                <li class="flex items-center gap-2"><span style="color: #4ade80; font-size: 10px">●</span> 80 GB SSD</li>
                <li class="flex items-center gap-2"><span style="color: #4ade80; font-size: 10px">●</span> 10 sites</li>
                <li class="flex items-center gap-2"><span style="color: #4ade80; font-size: 10px">●</span> GitHub auto-deploy</li>
              </ul>
              <a href="/pay?plan=premium&interval=monthly" class="funnel-btn funnel-btn-subtle w-full">Deploy Premium</a>
            </div>

          </div>

          <p class="text-center mt-10 funnel-body-sm" style="color: #6b7280">
            No contracts. Cancel anytime.
            <a href="/pricing" class="underline" style="color: #60a5fa">Full pricing details →</a>
          </p>
        </div>
      </section>

      <!-- ═══════════════════════════════════════
           6. FINAL CTA
           One last push to convert
           ═══════════════════════════════════════ -->
      <section class="funnel-section funnel-bg-cta">
        <div class="funnel-prose text-center">
          <h2 class="funnel-heading-2 mb-4 reveal">Try it for 3&nbsp;days. Free.</h2>
          <p class="funnel-body mb-8 reveal">Deploy your server in minutes.<br> No credit card required to&nbsp;explore.</p>
          <div class="flex flex-col sm:flex-row items-center justify-center gap-3 reveal">
            <a href="/register" class="funnel-btn funnel-btn-primary">
              Sign up free
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
            </a>
            <a href="/is-this-safe" class="funnel-btn funnel-btn-ghost">Is this safe? →</a>
          </div>
          <p class="mt-6 funnel-body-sm reveal"><a href="/docs" class="underline hover:text-white transition-colors" style="color: #60a5fa">See how it works? →</a></p>
        </div>
      </section>

    </main>

    ${getFooter()}

    ${getScripts('nav.js', 'scroll-reveal.js')}
  `);
};
