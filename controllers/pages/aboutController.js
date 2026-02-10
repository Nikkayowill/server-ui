const { getHTMLHead, getScripts, getFooter, getResponsiveNav } = require('../../helpers');

exports.showAbout = (req, res) => {
  res.send(`
${getHTMLHead('About - Clouded Basement')}
    ${getResponsiveNav(req)}
    
    <main class="bg-black min-h-screen pt-36 sm:pt-40 pb-20">
      <div class="max-w-3xl mx-auto px-6 sm:px-8">
        
        <!-- Header -->
        <h1 class="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-[1.1] tracking-tight mb-6">About Clouded Basement</h1>
        <p class="text-lg sm:text-xl text-gray-400 leading-relaxed mb-16 lg:mb-24 max-w-2xl">Reliable VPS hosting made simple. Full server control without the hassle.</p>
        
        <!-- What it is -->
        <div class="mb-16 lg:mb-24">
          <p class="text-gray-300 text-base sm:text-lg leading-[1.8]">Clouded Basement provides developers with full VPS control without the hassle. Deploy your applications quickly, with automated setup and monitoring, while keeping access to the underlying system.</p>
          <p class="text-gray-300 text-base sm:text-lg leading-[1.8] mt-5">Whether you want a testing environment or a production deployment, Clouded Basement handles the hard parts so you can focus on building.</p>
        </div>
        
        <div class="h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent mb-16 lg:mb-24"></div>
        
        <!-- Founder -->
        <div class="mb-16 lg:mb-24">
          <div class="flex flex-col sm:flex-row items-start gap-6 sm:gap-8 mb-8">
            <div class="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden ring-1 ring-white/10 flex-shrink-0">
              <img src="/hero%20personal%20portfolio.jpg" alt="Kayo Williams" class="w-full h-full object-cover">
            </div>
            <div class="pt-1">
              <h2 class="text-2xl sm:text-3xl font-bold text-white mb-1">Kayo Williams</h2>
              <p class="text-blue-400 text-sm font-medium tracking-wide">Founder & Developer</p>
            </div>
          </div>
          <p class="text-gray-300 text-base sm:text-lg leading-[1.8]">Before tech, I worked in the trades for an oil and heating company. Diagnosing complex systems, troubleshooting under pressure, and solving problems methodically were part of the job — skills I now apply to building and maintaining infrastructure.</p>
          <p class="text-gray-300 text-base sm:text-lg leading-[1.8] mt-5">Clouded Basement is my way of creating a platform that's both reliable and usable, designed from the ground up with real-world developer needs in mind.</p>
        </div>
        
        <div class="h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent mb-16 lg:mb-24"></div>
        
        <!-- Why it exists -->
        <div class="mb-16 lg:mb-24">
          <h2 class="text-2xl sm:text-3xl font-bold text-white mb-8">Why Clouded Basement exists</h2>
          <p class="text-gray-300 text-base sm:text-lg leading-[1.8] mb-8">Deploying apps shouldn't be this painful. Most platforms hide too much of the system, and managing a raw VPS means hours of manual configuration. Clouded Basement sits in the middle.</p>
          
          <div class="space-y-4 pl-1">
            <div class="flex items-start gap-3">
              <span class="text-blue-400 mt-1.5 text-xs">&#9679;</span>
              <p class="text-gray-300">A real VPS with full SSH and root access</p>
            </div>
            <div class="flex items-start gap-3">
              <span class="text-blue-400 mt-1.5 text-xs">&#9679;</span>
              <p class="text-gray-300">Automated provisioning, updates, and monitoring</p>
            </div>
            <div class="flex items-start gap-3">
              <span class="text-blue-400 mt-1.5 text-xs">&#9679;</span>
              <p class="text-gray-300">GitHub integration — connect your repo, click deploy, your site is live</p>
            </div>
            <div class="flex items-start gap-3">
              <span class="text-blue-400 mt-1.5 text-xs">&#9679;</span>
              <p class="text-gray-300">Free subdomain included with every server</p>
            </div>
            <div class="flex items-start gap-3">
              <span class="text-blue-400 mt-1.5 text-xs">&#9679;</span>
              <p class="text-gray-300">Custom domains with automatic SSL via Let's Encrypt</p>
            </div>
            <div class="flex items-start gap-3">
              <span class="text-blue-400 mt-1.5 text-xs">&#9679;</span>
              <p class="text-gray-300">Nginx, Node.js, and Python pre-installed and ready</p>
            </div>
            <div class="flex items-start gap-3">
              <span class="text-blue-400 mt-1.5 text-xs">&#9679;</span>
              <p class="text-gray-300">Hardened security out of the box — firewall, rate limiting, security headers</p>
            </div>
          </div>
          
          <p class="text-gray-500 text-sm mt-8 italic">You retain control, but without spending hours on setup.</p>
        </div>
        
        <div class="h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent mb-16 lg:mb-24"></div>
        
        <!-- Technology -->
        <div class="mb-16 lg:mb-24">
          <h2 class="text-2xl sm:text-3xl font-bold text-white mb-8">Technology & reliability</h2>
          <p class="text-gray-300 text-base sm:text-lg leading-[1.8] mb-6">Built with stability and maintainability as priorities. Automation ensures smooth operations, while critical tasks are monitored to guarantee predictable performance.</p>
          <p class="text-gray-500 text-sm leading-relaxed">Node.js &middot; Express &middot; PostgreSQL &middot; Stripe &middot; DigitalOcean &middot; Ubuntu LTS &middot; Let's Encrypt &middot; Nginx &middot; Helmet &middot; bcrypt</p>
        </div>
        
        <div class="h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent mb-16 lg:mb-24"></div>
        
        <!-- Approach -->
        <div class="mb-16 lg:mb-24">
          <h2 class="text-2xl sm:text-3xl font-bold text-white mb-8">Our approach</h2>
          <p class="text-gray-300 text-base sm:text-lg leading-[1.8]">We're not competing with hyperscale providers. The goal is simple: a hosting platform that works reliably and reduces friction, letting developers focus on their projects.</p>
          <p class="text-gray-300 text-base sm:text-lg leading-[1.8] mt-5">New features are added gradually, guided by real user needs and practical considerations — not arbitrary checklists.</p>
        </div>
        
        <div class="h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent mb-16 lg:mb-24"></div>
        
        <!-- Links -->
        <div class="mb-16 lg:mb-24">
          <div class="flex flex-col sm:flex-row gap-6 sm:gap-12">
            <a href="https://github.com/Nikkayowill/CloudedBasement" target="_blank" rel="noopener noreferrer" class="text-gray-400 hover:text-white transition-colors text-sm group">
              GitHub <span class="inline-block transition-transform group-hover:translate-x-0.5">&rarr;</span>
            </a>
            <a href="/docs" class="text-gray-400 hover:text-white transition-colors text-sm group">
              Documentation <span class="inline-block transition-transform group-hover:translate-x-0.5">&rarr;</span>
            </a>
            <a href="/pricing" class="text-gray-400 hover:text-white transition-colors text-sm group">
              Pricing <span class="inline-block transition-transform group-hover:translate-x-0.5">&rarr;</span>
            </a>
          </div>
        </div>
        
        <!-- CTA -->
        <div class="pt-12 border-t border-white/5">
          <h3 class="text-xl font-semibold text-white mb-3">Get in touch</h3>
          <p class="text-gray-400 text-sm leading-relaxed mb-6 max-w-lg">Questions about the platform, tech details, or just want to connect? Clouded Basement is maintained steadily with reliability and clarity as priorities.</p>
          <a href="/contact" class="inline-flex items-center text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors group">
            Contact us <span class="inline-block ml-1 transition-transform group-hover:translate-x-0.5">&rarr;</span>
          </a>
        </div>
        
      </div>
    </main>
    
    ${getFooter()}
    ${getScripts('nav.js')}
  `);
};
