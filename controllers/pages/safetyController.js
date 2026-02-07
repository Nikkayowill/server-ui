const { getHTMLHead, getScripts, getFooter, getResponsiveNav } = require('../../helpers');

exports.showSafety = (req, res) => {
  res.send(`
${getHTMLHead('Is Clouded Basement safe to use? - Basement')}
    ${getResponsiveNav(req)}
    
    <main class="bg-black min-h-screen pt-24 pb-16">
      <div class="max-w-3xl mx-auto px-8 md:px-12 lg:px-16">
        <!-- Page Title -->
        <h1 class="text-3xl md:text-4xl font-bold text-white mb-12 leading-tight">Is Clouded Basement safe to use?</h1>
        
        <!-- Section 1: Honest opener -->
        <section class="mb-12">
          <p class="text-gray-300 text-lg leading-relaxed mb-4">Clouded Basement is a new product, built and operated by a solo developer.</p>
          <p class="text-gray-300 text-lg leading-relaxed">If you're deciding whether to trust it with your code or data, that's a fair question  —  and this page exists to answer it honestly.</p>
        </section>
        
        <!-- Section 2: What you actually get -->
        <section class="mb-12">
          <h2 class="text-2xl font-bold text-white mb-6">What you actually get</h2>
          <p class="text-gray-300 text-lg leading-relaxed mb-4">You are not renting a black-box platform.</p>
          <p class="text-gray-300 text-lg leading-relaxed mb-6">Every Clouded Basement project runs on its own VPS hosted on DigitalOcean infrastructure.</p>
          
          <p class="text-gray-300 text-lg leading-relaxed mb-3">You receive:</p>
          <ul class="list-none space-y-2 mb-6">
            <li class="text-gray-300 text-lg leading-relaxed pl-6 relative before:content-['•'] before:absolute before:left-0 before:text-brand">Full root SSH access</li>
            <li class="text-gray-300 text-lg leading-relaxed pl-6 relative before:content-['•'] before:absolute before:left-0 before:text-brand">Your own server IP</li>
            <li class="text-gray-300 text-lg leading-relaxed pl-6 relative before:content-['•'] before:absolute before:left-0 before:text-brand">Direct control over your files, processes, and data</li>
          </ul>
          
          <p class="text-gray-300 text-lg leading-relaxed">Clouded Basement automates setup and deployment  —  but the server itself is yours.</p>
        </section>
        
        <!-- Section 3: What happens if something goes wrong -->
        <section class="mb-12">
          <h2 class="text-2xl font-bold text-white mb-6">What if I stop running this?</h2>
          <p class="text-gray-300 text-lg leading-relaxed mb-4">Let's say I get hit by a bus or decide to become a monk (hopefully neither):</p>
          
          <ul class="list-none space-y-2 mb-6">
            <li class="text-gray-300 text-lg leading-relaxed pl-6 relative before:content-['•'] before:absolute before:left-0 before:text-brand">Your server keeps running on DigitalOcean</li>
            <li class="text-gray-300 text-lg leading-relaxed pl-6 relative before:content-['•'] before:absolute before:left-0 before:text-brand">Your SSH credentials still work</li>
            <li class="text-gray-300 text-lg leading-relaxed pl-6 relative before:content-['•'] before:absolute before:left-0 before:text-brand">Your code and data are yours to keep</li>
          </ul>
          
          <p class="text-gray-300 text-lg leading-relaxed">No vendor lock-in means you're not trapped. Take your server, move it, modify it, do whatever you want with it.</p>
        </section>
        
        <!-- Section 4: Security & responsibility -->
        <section class="mb-12">
          <h2 class="text-2xl font-bold text-white mb-6">Security & responsibility</h2>
          <p class="text-gray-300 text-lg leading-relaxed mb-4">Servers are provisioned with:</p>
          
          <ul class="list-none space-y-2 mb-6">
            <li class="text-gray-300 text-lg leading-relaxed pl-6 relative before:content-['•'] before:absolute before:left-0 before:text-brand">Ubuntu 22.04 LTS</li>
            <li class="text-gray-300 text-lg leading-relaxed pl-6 relative before:content-['•'] before:absolute before:left-0 before:text-brand">Automatic HTTPS via Let's Encrypt</li>
            <li class="text-gray-300 text-lg leading-relaxed pl-6 relative before:content-['•'] before:absolute before:left-0 before:text-brand">Rate limiting and basic hardening</li>
          </ul>
          
          <p class="text-gray-300 text-lg leading-relaxed mb-4">That said, Clouded Basement is not an enterprise compliance platform.</p>
          <p class="text-gray-300 text-lg leading-relaxed">If you require HIPAA, SOC 2, or regulated data hosting, this service is not a fit  —  and that's intentional.</p>
        </section>
        
        <!-- Section 5: Support & accountability -->
        <section class="mb-12">
          <h2 class="text-2xl font-bold text-white mb-6">Support & accountability</h2>
          <p class="text-gray-300 text-lg leading-relaxed mb-4">When you contact support, you're talking directly to the person who built the system.</p>
          <p class="text-gray-300 text-lg leading-relaxed">I respond within 24 hours and personally handle issues related to provisioning, deployment, and configuration.</p>
        </section>
        
        <!-- Section 6: Risk reversal -->
        <section class="mb-12">
          <h2 class="text-2xl font-bold text-white mb-6">Risk reversal</h2>
          <p class="text-gray-300 text-lg leading-relaxed mb-4">If Clouded Basement doesn't work for you:</p>
          
          <ul class="list-none space-y-2 mb-6">
            <li class="text-gray-300 text-lg leading-relaxed pl-6 relative before:content-['•'] before:absolute before:left-0 before:text-brand">Cancel anytime  —  no contracts</li>
            <li class="text-gray-300 text-lg leading-relaxed pl-6 relative before:content-['•'] before:absolute before:left-0 before:text-brand">Full root access  —  it's your server</li>
            <li class="text-gray-300 text-lg leading-relaxed pl-6 relative before:content-['•'] before:absolute before:left-0 before:text-brand">Direct support from the founder</li>
          </ul>
          
          <p class="text-gray-300 text-lg leading-relaxed">Early users are also eligible for free migration help from their existing host.</p>
        </section>
        
        <!-- CTA -->
        <div class="mt-16 pt-8 border-t border-blue-500/30 text-center">
          <a href="/pricing" class="inline-block px-8 py-4 text-white bg-brand rounded-lg hover:bg-cyan-500 hover:scale-105 hover:shadow-[0_0_30px_rgba(45,167,223,0.6)] transition-all font-bold uppercase tracking-wider text-sm">View Plans</a>
          <p class="text-gray-500 text-sm mt-4">Or <a href="/contact" class="text-brand hover:text-cyan-400 underline">contact me</a> if you have more questions.</p>
        </div>
      </div>
    </main>
    
    ${getFooter()}
    ${getScripts('nav.js')}
  `);
};
