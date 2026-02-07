const { getHTMLHead, getScripts, getFooter, getResponsiveNav } = require('../../helpers');

exports.showAbout = (req, res) => {
  res.send(`
${getHTMLHead('About - Basement')}
    ${getResponsiveNav(req)}
    
    <main class="bg-black min-h-screen pt-24 pb-16">
      <div class="max-w-4xl mx-auto px-8 md:px-12 lg:px-16">
        <h1 class="text-4xl md:text-5xl font-extrabold text-white mb-8">ABOUT BASEMENT</h1>
        
        <p class="text-gray-300 text-lg mb-8">I'm Kayo, an IT Web Programming student at NSCC in Halifax, graduating May 2026. Before switching to tech, I worked as a tradesman — different tools, same problem-solving mindset.</p>
        
        <h2 class="text-2xl font-bold text-white mt-12 mb-4">WHY I BUILT THIS</h2>
        
        <p class="text-gray-300 mb-4">I wanted to prove I could build and deploy a real production application from the ground up. Not just for a grade, but something that actually handles payments, provisions servers, and solves a real problem.</p>
        
        <p class="text-gray-300 mb-8">Cloud hosting doesn't need to be complicated. You shouldn't need a PhD to deploy a Node app or a static site. Basement gives you a real server you can SSH into, plus a dashboard for the routine stuff. Simple.</p>
        
        <h2 class="text-2xl font-bold text-white mt-12 mb-4">HOW IT WORKS</h2>
        
        <p class="text-gray-300 mb-4">I'm running this as a small operation. The infrastructure is enterprise-grade (DigitalOcean droplets), but I'm building features incrementally based on what users actually need. Current setup handles individual developers and small teams deploying web apps, APIs, and services.</p>
        
        <p class="text-gray-300 mb-8">As more people use it, I expand capabilities. I prioritize stability over speed — every feature gets tested properly before it ships.</p>
        
        <h2 class="text-2xl font-bold text-white mt-12 mb-4">THE TECH</h2>
        
        <p class="text-gray-300 mb-8">Built with <strong class="text-white">Node.js</strong>, <strong class="text-white">Express</strong>, <strong class="text-white">PostgreSQL</strong>, and <strong class="text-white">Stripe</strong>. Servers run <strong class="text-white">Ubuntu LTS</strong> on <strong class="text-white">DigitalOcean</strong>. Security includes automated OS updates and DDoS protection.</p>
        
        <h2 class="text-2xl font-bold text-white mt-12 mb-4">OPEN SOURCE</h2>
        
        <p class="text-gray-300 mb-4">The entire dashboard and deployment tooling is open source. You can see how everything works, contribute improvements, or fork it for your own projects. Transparency matters.</p>
        
        <p class="mb-8"><a href="#" class="text-blue-300 underline hover:text-blue-200 transition-colors" target="_blank" rel="noopener noreferrer">View on GitHub →</a></p>
        
        <p class="mt-12 pt-8 border-t border-blue-500/30 text-gray-300">This is my capstone project and portfolio piece. If you're evaluating my work or have questions about the technical implementation, <a href="/contact" class="text-blue-300 underline hover:text-blue-200 transition-colors">reach out</a>.</p>
        
        <a href="/" class="inline-block mt-8 px-6 py-3 text-white border border-blue-400 rounded-lg bg-blue-600 hover:bg-blue-500 hover:scale-105 hover:shadow-[0_0_30px_rgba(135,206,250,0.6)] transition-all font-medium uppercase tracking-wider text-sm">Back to home</a>
      </div>
    </main>
    
    ${getFooter()}
    ${getScripts('nav.js')}
  `);
};
