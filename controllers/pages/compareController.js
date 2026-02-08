const { getHTMLHead, getScripts, getFooter, getResponsiveNav } = require('../../helpers');

exports.showCompare = (req, res) => {
  res.send(`
${getHTMLHead('Compare Hosting Platforms - Clouded Basement vs Heroku, Render, DigitalOcean')}
    ${getResponsiveNav(req)}
    
    <main class="bg-black min-h-screen pt-24 pb-16">
      <section class="max-w-3xl mx-auto px-4 sm:px-6">
        
        <!-- Page Header -->
        <div class="text-center mb-16">
          <h1 class="text-3xl md:text-5xl font-extrabold text-white mb-4">How We Compare</h1>
          <p class="text-gray-400 text-lg max-w-2xl mx-auto">Every platform makes trade-offs. Here's an honest look at where Clouded Basement fits.</p>
        </div>

        <!-- TL;DR Positioning -->
        <div class="bg-gray-900 border border-gray-700 rounded-xl p-8 mb-16">
          <h2 class="text-xl font-bold text-white mb-4">The short version</h2>
          <p class="text-gray-300 leading-relaxed mb-4">Platforms like Heroku and Render are convenient but give you a managed container — you don't get SSH, root access, or control over the OS. Raw VPS providers like DigitalOcean give you total control but leave setup, deployment, SSL, and security to you.</p>
          <p class="text-gray-300 leading-relaxed"><strong class="text-white">Clouded Basement gives you both.</strong> A real Ubuntu server with full root access, plus managed Git deployments, automatic SSL, security updates, and a dashboard to control everything.</p>
        </div>

        <!-- Main Comparison Table -->
        <div class="mb-16">
          <h2 class="text-2xl font-bold text-white text-center mb-8">Feature Comparison</h2>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-700">
                  <th class="text-left py-3 px-4 text-gray-400 font-medium min-w-[180px]">Feature</th>
                  <th class="text-center py-3 px-4 text-blue-300 font-bold min-w-[120px]">Basement</th>
                  <th class="text-center py-3 px-4 text-gray-300 font-bold min-w-[120px]">Heroku</th>
                  <th class="text-center py-3 px-4 text-gray-300 font-bold min-w-[120px]">Render</th>
                  <th class="text-center py-3 px-4 text-gray-300 font-bold min-w-[120px]">Railway</th>
                  <th class="text-center py-3 px-4 text-gray-300 font-bold min-w-[120px]">DIY VPS</th>
                </tr>
              </thead>
              <tbody class="text-gray-300">
                <tr class="border-b border-gray-800">
                  <td class="py-3 px-4 text-gray-400">Full SSH & root access</td>
                  <td class="text-center text-green-400">✓</td>
                  <td class="text-center text-red-400">✗</td>
                  <td class="text-center text-red-400">✗</td>
                  <td class="text-center text-red-400">✗</td>
                  <td class="text-center text-green-400">✓</td>
                </tr>
                <tr class="border-b border-gray-800">
                  <td class="py-3 px-4 text-gray-400">Your own dedicated server</td>
                  <td class="text-center text-green-400">✓</td>
                  <td class="text-center text-red-400">✗</td>
                  <td class="text-center text-red-400">✗</td>
                  <td class="text-center text-red-400">✗</td>
                  <td class="text-center text-green-400">✓</td>
                </tr>
                <tr class="border-b border-gray-800">
                  <td class="py-3 px-4 text-gray-400">Git push to deploy</td>
                  <td class="text-center text-green-400">✓</td>
                  <td class="text-center text-green-400">✓</td>
                  <td class="text-center text-green-400">✓</td>
                  <td class="text-center text-green-400">✓</td>
                  <td class="text-center text-red-400">✗</td>
                </tr>
                <tr class="border-b border-gray-800">
                  <td class="py-3 px-4 text-gray-400">GitHub auto-deploy</td>
                  <td class="text-center text-green-400">✓</td>
                  <td class="text-center text-green-400">✓</td>
                  <td class="text-center text-green-400">✓</td>
                  <td class="text-center text-green-400">✓</td>
                  <td class="text-center text-red-400">✗</td>
                </tr>
                <tr class="border-b border-gray-800">
                  <td class="py-3 px-4 text-gray-400">Custom domains</td>
                  <td class="text-center text-green-400">✓</td>
                  <td class="text-center text-green-400">✓</td>
                  <td class="text-center text-green-400">✓</td>
                  <td class="text-center text-green-400">✓</td>
                  <td class="text-center text-yellow-400">Manual</td>
                </tr>
                <tr class="border-b border-gray-800">
                  <td class="py-3 px-4 text-gray-400">Automatic SSL</td>
                  <td class="text-center text-green-400">✓</td>
                  <td class="text-center text-green-400">✓</td>
                  <td class="text-center text-green-400">✓</td>
                  <td class="text-center text-green-400">✓</td>
                  <td class="text-center text-yellow-400">Manual</td>
                </tr>
                <tr class="border-b border-gray-800">
                  <td class="py-3 px-4 text-gray-400">One-click database</td>
                  <td class="text-center text-green-400">✓</td>
                  <td class="text-center text-green-400">✓</td>
                  <td class="text-center text-green-400">✓</td>
                  <td class="text-center text-green-400">✓</td>
                  <td class="text-center text-red-400">✗</td>
                </tr>
                <tr class="border-b border-gray-800">
                  <td class="py-3 px-4 text-gray-400">Environment variables</td>
                  <td class="text-center text-green-400">✓</td>
                  <td class="text-center text-green-400">✓</td>
                  <td class="text-center text-green-400">✓</td>
                  <td class="text-center text-green-400">✓</td>
                  <td class="text-center text-yellow-400">Manual</td>
                </tr>
                <tr class="border-b border-gray-800">
                  <td class="py-3 px-4 text-gray-400">Managed security updates</td>
                  <td class="text-center text-green-400">✓</td>
                  <td class="text-center text-green-400">✓</td>
                  <td class="text-center text-green-400">✓</td>
                  <td class="text-center text-green-400">✓</td>
                  <td class="text-center text-red-400">✗</td>
                </tr>
                <tr class="border-b border-gray-800">
                  <td class="py-3 px-4 text-gray-400">No vendor lock-in</td>
                  <td class="text-center text-green-400">✓</td>
                  <td class="text-center text-red-400">✗</td>
                  <td class="text-center text-red-400">✗</td>
                  <td class="text-center text-red-400">✗</td>
                  <td class="text-center text-green-400">✓</td>
                </tr>
                <tr class="border-b border-gray-800">
                  <td class="py-3 px-4 text-gray-400">Predictable pricing</td>
                  <td class="text-center text-green-400">✓</td>
                  <td class="text-center text-green-400">✓</td>
                  <td class="text-center text-green-400">✓</td>
                  <td class="text-center text-yellow-400">Usage</td>
                  <td class="text-center text-green-400">✓</td>
                </tr>
                <tr class="border-b border-gray-800">
                  <td class="py-3 px-4 text-gray-400">Free trial (no card)</td>
                  <td class="text-center text-green-400">3 days</td>
                  <td class="text-center text-red-400">✗</td>
                  <td class="text-center text-green-400">Free tier</td>
                  <td class="text-center text-green-400">Free trial</td>
                  <td class="text-center text-red-400">✗</td>
                </tr>
                <tr class="border-b border-gray-800">
                  <td class="py-3 px-4 text-gray-400">Run any language/framework</td>
                  <td class="text-center text-green-400">✓</td>
                  <td class="text-center text-yellow-400">Buildpacks</td>
                  <td class="text-center text-yellow-400">Native + Docker</td>
                  <td class="text-center text-yellow-400">Nixpacks</td>
                  <td class="text-center text-green-400">✓</td>
                </tr>
                <tr class="border-b border-gray-800">
                  <td class="py-3 px-4 text-gray-400">Install system packages</td>
                  <td class="text-center text-green-400">apt-get</td>
                  <td class="text-center text-red-400">✗</td>
                  <td class="text-center text-red-400">✗</td>
                  <td class="text-center text-red-400">✗</td>
                  <td class="text-center text-green-400">apt-get</td>
                </tr>
                <tr class="border-b border-gray-800">
                  <td class="py-3 px-4 text-gray-400">Persistent filesystem</td>
                  <td class="text-center text-green-400">✓</td>
                  <td class="text-center text-red-400">Ephemeral</td>
                  <td class="text-center text-red-400">Ephemeral</td>
                  <td class="text-center text-red-400">Ephemeral</td>
                  <td class="text-center text-green-400">✓</td>
                </tr>
                <tr class="border-b border-gray-800">
                  <td class="py-3 px-4 text-gray-400">Setup time</td>
                  <td class="text-center text-blue-300">~2 min</td>
                  <td class="text-center">~5 min</td>
                  <td class="text-center">~5 min</td>
                  <td class="text-center">~3 min</td>
                  <td class="text-center text-yellow-400">30-60 min</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Detailed Competitor Sections -->
        
        <!-- vs DIY VPS -->
        <div class="mb-16">
          <h2 class="text-2xl font-bold text-white mb-6">Clouded Basement vs. DIY VPS <span class="text-gray-500 text-lg font-normal">(DigitalOcean, Linode, Vultr)</span></h2>
          <div class="grid md:grid-cols-2 gap-6">
            <div class="bg-gray-900 border border-gray-700 rounded-lg p-6">
              <h3 class="text-blue-400 font-bold mb-3">What you skip with Basement</h3>
              <ul class="space-y-2 text-sm text-gray-300">
                <li class="flex items-start gap-2"><span class="text-green-400 mt-0.5">✓</span> Setting up Nginx reverse proxy configs</li>
                <li class="flex items-start gap-2"><span class="text-green-400 mt-0.5">✓</span> Configuring Certbot / SSL certificates</li>
                <li class="flex items-start gap-2"><span class="text-green-400 mt-0.5">✓</span> Writing deployment scripts</li>
                <li class="flex items-start gap-2"><span class="text-green-400 mt-0.5">✓</span> Setting up firewall rules (UFW)</li>
                <li class="flex items-start gap-2"><span class="text-green-400 mt-0.5">✓</span> Installing Node.js, Python, Go, Rust</li>
                <li class="flex items-start gap-2"><span class="text-green-400 mt-0.5">✓</span> Managing OS security updates</li>
                <li class="flex items-start gap-2"><span class="text-green-400 mt-0.5">✓</span> Configuring database servers</li>
              </ul>
            </div>
            <div class="bg-gray-900 border border-gray-700 rounded-lg p-6">
              <h3 class="text-blue-400 font-bold mb-3">What you still get</h3>
              <ul class="space-y-2 text-sm text-gray-300">
                <li class="flex items-start gap-2"><span class="text-green-400 mt-0.5">✓</span> Full root SSH access to your server</li>
                <li class="flex items-start gap-2"><span class="text-green-400 mt-0.5">✓</span> Install anything with apt-get</li>
                <li class="flex items-start gap-2"><span class="text-green-400 mt-0.5">✓</span> Your own IP address</li>
                <li class="flex items-start gap-2"><span class="text-green-400 mt-0.5">✓</span> Persistent filesystem (not containers)</li>
                <li class="flex items-start gap-2"><span class="text-green-400 mt-0.5">✓</span> Run background processes, cron jobs</li>
                <li class="flex items-start gap-2"><span class="text-green-400 mt-0.5">✓</span> No vendor lock-in — take your server and leave</li>
                <li class="flex items-start gap-2"><span class="text-green-400 mt-0.5">✓</span> Full control over everything</li>
              </ul>
            </div>
          </div>
          <p class="text-gray-400 text-sm mt-4">A DigitalOcean droplet with similar specs (1GB/1vCPU) is $6/mo — but you'll spend hours setting up everything Basement automates. Your time has value.</p>
        </div>

        <!-- vs Heroku -->
        <div class="mb-16">
          <h2 class="text-2xl font-bold text-white mb-6">Clouded Basement vs. Heroku</h2>
          <div class="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <p class="text-gray-300 leading-relaxed mb-4">Heroku pioneered push-to-deploy and is well-known, but their free tier was removed in 2022. The cheapest option is the Eco plan at $5/mo (shared pool of 1,000 dyno hours) with 512MB RAM, or the Basic plan at $7/mo per dyno. Add a managed Postgres database and costs climb quickly. You don't get SSH access, you can't install system packages, and your filesystem resets on every deploy.</p>
            <div class="grid md:grid-cols-2 gap-4 mt-4">
              <div>
                <h4 class="text-sm font-bold text-green-400 mb-2">Basement advantages</h4>
                <ul class="space-y-1 text-sm text-gray-300">
                  <li>• Full SSH & root access</li>
                  <li>• Persistent filesystem</li>
                  <li>• Install any system package</li>
                  <li>• Multiple sites on one server</li>
                  <li>• No slug size limits</li>
                </ul>
              </div>
              <div>
                <h4 class="text-sm font-bold text-purple-400 mb-2">Heroku advantages</h4>
                <ul class="space-y-1 text-sm text-gray-300">
                  <li>• Larger ecosystem of add-ons</li>
                  <li>• Auto-scaling (paid plans)</li>
                  <li>• Longer track record</li>
                  <li>• Team collaboration features</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <!-- vs Render -->
        <div class="mb-16">
          <h2 class="text-2xl font-bold text-white mb-6">Clouded Basement vs. Render</h2>
          <div class="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <p class="text-gray-300 leading-relaxed mb-4">Render is a solid PaaS with a free tier (512MB, spins down after inactivity). Paid instances start at $7/mo for 512MB RAM (Starter) up to $85/mo for 4GB (Pro). Render supports native runtimes and Docker, and offers SSH access for debugging — but not full root access. You can't install system packages or modify the OS.</p>
            <div class="grid md:grid-cols-2 gap-4 mt-4">
              <div>
                <h4 class="text-sm font-bold text-green-400 mb-2">Basement advantages</h4>
                <ul class="space-y-1 text-sm text-gray-300">
                  <li>• Full SSH & root access</li>
                  <li>• No cold starts — your server is always on</li>
                  <li>• Run any language natively (install via apt-get)</li>
                  <li>• Multiple sites on one server</li>
                  <li>• Persistent disk by default</li>
                </ul>
              </div>
              <div>
                <h4 class="text-sm font-bold text-purple-400 mb-2">Render advantages</h4>
                <ul class="space-y-1 text-sm text-gray-300">
                  <li>• Free tier available</li>
                  <li>• Static site hosting</li>
                  <li>• Managed Redis and Postgres</li>
                  <li>• SSH access for debugging</li>
                  <li>• Persistent disks available (paid add-on)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <!-- vs Railway -->
        <div class="mb-16">
          <h2 class="text-2xl font-bold text-white mb-6">Clouded Basement vs. Railway</h2>
          <div class="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <p class="text-gray-300 leading-relaxed mb-4">Railway has a great developer experience with usage-based pricing (billed per second). They offer a 30-day free trial with $5 in credits (no card required), then a Hobby plan at $5/mo or Pro at $20/mo — both include credits, but you pay for usage beyond that. Costs can spike unpredictably with traffic, and like other PaaS platforms, you're running on shared infrastructure without root access or OS-level control.</p>
            <div class="grid md:grid-cols-2 gap-4 mt-4">
              <div>
                <h4 class="text-sm font-bold text-green-400 mb-2">Basement advantages</h4>
                <ul class="space-y-1 text-sm text-gray-300">
                  <li>• Predictable flat pricing (no surprise bills)</li>
                  <li>• Full SSH & root access</li>
                  <li>• Dedicated resources (not shared)</li>
                  <li>• Persistent filesystem</li>
                  <li>• No usage caps or metering</li>
                </ul>
              </div>
              <div>
                <h4 class="text-sm font-bold text-purple-400 mb-2">Railway advantages</h4>
                <ul class="space-y-1 text-sm text-gray-300">
                  <li>• Pay-per-use (good for low-traffic)</li>
                  <li>• Slick dashboard UI</li>
                  <li>• Instant project templates</li>
                  <li>• Broader community</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <!-- Best For Section -->
        <div class="mb-16">
          <h2 class="text-2xl font-bold text-white text-center mb-8">Who is Basement best for?</h2>
          <div class="grid md:grid-cols-3 gap-6">
            <div class="bg-gray-900 border border-gray-700 rounded-lg p-6 text-center">
              <div class="text-3xl mb-3">🚀</div>
              <h3 class="text-white font-bold mb-2">Solo developers</h3>
              <p class="text-gray-400 text-sm">Ship side projects and SaaS apps on your own server without managing infrastructure.</p>
            </div>
            <div class="bg-gray-900 border border-gray-700 rounded-lg p-6 text-center">
              <div class="text-3xl mb-3">💼</div>
              <h3 class="text-white font-bold mb-2">Freelancers</h3>
              <p class="text-gray-400 text-sm">Host multiple client projects on one server. Custom domains, SSL, and deployments handled for you.</p>
            </div>
            <div class="bg-gray-900 border border-gray-700 rounded-lg p-6 text-center">
              <div class="text-3xl mb-3">🎓</div>
              <h3 class="text-white font-bold mb-2">Developers learning DevOps</h3>
              <p class="text-gray-400 text-sm">Get a real server with SSH access, but without the hours of setup. Learn on a working system.</p>
            </div>
          </div>
        </div>

        <!-- Honest Disclaimer -->
        <div class="bg-gray-900/50 border border-gray-800 rounded-xl p-8 mb-16">
          <h2 class="text-xl font-bold text-white mb-4">When we're not the right fit</h2>
          <ul class="space-y-3 text-gray-300 text-sm">
            <li class="flex items-start gap-3">
              <span class="text-yellow-400 mt-0.5">→</span>
              <span><strong class="text-white">Enterprise teams</strong> needing multi-region, auto-scaling, and team RBAC — look at AWS, GCP, or Render Teams.</span>
            </li>
            <li class="flex items-start gap-3">
              <span class="text-yellow-400 mt-0.5">→</span>
              <span><strong class="text-white">Static sites only</strong> — Vercel, Netlify, or Cloudflare Pages are free and purpose-built for that.</span>
            </li>
            <li class="flex items-start gap-3">
              <span class="text-yellow-400 mt-0.5">→</span>
              <span><strong class="text-white">Serverless functions</strong> — if you don't need a persistent server, Lambda or Cloudflare Workers are better suited.</span>
            </li>
          </ul>
        </div>

        <!-- CTA -->
        <div class="text-center">
          <h2 class="text-2xl md:text-3xl font-bold text-white mb-4">Ready to try it?</h2>
          <p class="text-gray-400 mb-8">3-day free trial. No credit card. Real server in 2 minutes.</p>
          <div class="flex flex-col sm:flex-row justify-center gap-4">
            <a href="/register" class="inline-flex items-center justify-center px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-500 hover:scale-105 hover:shadow-[0_0_30px_rgba(0,102,255,0.6)] transition-all duration-300">
              Start Free Trial
              <svg class="ml-2 w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
            </a>
            <a href="/pricing" class="inline-flex items-center justify-center px-8 py-3 border border-gray-700 text-gray-300 font-medium rounded-lg hover:border-blue-500 hover:bg-blue-500/10 hover:text-white transition-all duration-300">
              View Pricing
            </a>
          </div>
        </div>

      </section>
    </main>
    
    ${getFooter()}
    ${getScripts('nav.js')}
  `);
};
