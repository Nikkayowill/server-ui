const { getHTMLHead, getScripts, getFooter, getResponsiveNav } = require('../../helpers');

exports.showFaq = (req, res) => {
  res.send(`
${getHTMLHead('FAQ - Basement')}
    ${getResponsiveNav(req)}
    
    <main class="bg-black min-h-screen pt-24 pb-16">
      <div class="max-w-4xl mx-auto px-8 md:px-12 lg:px-16">
        <h1 class="text-4xl md:text-5xl font-extrabold text-white text-center mb-4">Frequently Asked Questions</h1>
        <p class="text-gray-400 text-center mb-16">Quick answers to common questions</p>
        
        <div class="space-y-4">
          
          <div class="faq-item mb-4 bg-gray-800/30 border border-blue-500/10 rounded-lg overflow-hidden">
            <div class="p-6 cursor-pointer hover:bg-gray-800/50 transition-all flex justify-between items-center" onclick="toggleFaq(this)">
              <h3 class="text-lg font-medium text-white">Why wouldn't I just use DigitalOcean directly?</h3>
              <span class="text-2xl text-blue-400 transform transition-transform duration-300">+</span>
            </div>
            <div class="faq-answer overflow-hidden transition-all duration-300 max-h-0">
              <div class="px-6 pb-6">
                <p class="text-gray-400">DigitalOcean gives you raw infrastructure (Droplets) or a managed app platform. Droplets require you to install and maintain everything yourself  —  Ubuntu, Nginx, SSL, runtimes, and deployments. The App Platform automates deployments but does not give full server control. Clouded Basement automates provisioning and deployment while giving you full root access to your own server, saving you setup time without losing control.</p>
              </div>
            </div>
          </div>
          
          <div class="faq-item mb-4 bg-gray-800/30 border border-blue-500/10 rounded-lg overflow-hidden">
            <div class="p-6 cursor-pointer hover:bg-gray-800/50 transition-all flex justify-between items-center" onclick="toggleFaq(this)">
              <h3 class="text-lg font-medium text-white">Do I actually own my server?</h3>
              <span class="text-2xl text-blue-400 transform transition-transform duration-300">+</span>
            </div>
            <div class="faq-answer overflow-hidden transition-all duration-300 max-h-0">
              <div class="px-6 pb-6">
                <p class="text-gray-400">Yes. Every VPS is fully yours, with root access and a dedicated IP. You can install anything, modify the configuration, or migrate it elsewhere at any time. Clouded Basement just handles the initial setup and deployment automation.</p>
              </div>
            </div>
          </div>
          
          <div class="faq-item mb-4 bg-gray-800/30 border border-blue-500/10 rounded-lg overflow-hidden">
            <div class="p-6 cursor-pointer hover:bg-gray-800/50 transition-all flex justify-between items-center" onclick="toggleFaq(this)">
              <h3 class="text-lg font-medium text-white">What happens if I cancel?</h3>
              <span class="text-2xl text-blue-400 transform transition-transform duration-300">+</span>
            </div>
            <div class="faq-answer overflow-hidden transition-all duration-300 max-h-0">
              <div class="px-6 pb-6">
                <p class="text-gray-400">You can cancel anytime. Your server stays active until the end of your billing period so you can back up your data or migrate. After that, the server is shut down. No contracts, no cancellation fees.</p>
              </div>
            </div>
          </div>
          
          <div class="faq-item mb-4 bg-gray-800/30 border border-blue-500/10 rounded-lg overflow-hidden">
            <div class="p-6 cursor-pointer hover:bg-gray-800/50 transition-all flex justify-between items-center" onclick="toggleFaq(this)">
              <h3 class="text-lg font-medium text-white">How is Clouded Basement different from Heroku or Vercel?</h3>
              <span class="text-2xl text-blue-400 transform transition-transform duration-300">+</span>
            </div>
            <div class="faq-answer overflow-hidden transition-all duration-300 max-h-0">
              <div class="px-6 pb-6">
                <p class="text-gray-400">Unlike PaaS platforms, Clouded Basement gives you full server control with automated setup and deployment. You avoid vendor lock-in while still enjoying one-click provisioning, SSL, and GitHub deployments.</p>
              </div>
            </div>
          </div>
          
        </div>
        
        <div class="bg-gray-800/30 border border-blue-500/20 rounded-lg p-12 text-center">
            <h2 class="text-3xl font-bold text-white mb-4">Still Have Questions?</h2>
            <p class="text-gray-400 mb-8">Can't find the answer you're looking for? Our support team is here to help.</p>
            <a href="/contact" class="inline-block px-8 py-4 bg-blue-600 text-white font-bold rounded hover:bg-blue-500 hover:scale-105 hover:shadow-[0_0_30px_rgba(0,102,255,0.6)] transition-all duration-300 uppercase tracking-wider text-sm">Contact Support</a>
        </div>
      </div>
    </main>
    
    ${getFooter()}
    ${getScripts('nav.js', 'faq.js')}
  `);
};
