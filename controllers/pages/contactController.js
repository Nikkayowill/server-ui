const { validationResult } = require('express-validator');
const { getHTMLHead, getScripts, getFooter, getResponsiveNav } = require('../../helpers');
const { sendContactEmail } = require('../../services/email');
const { validateEmailDomain } = require('../../utils/emailValidation');

exports.showContact = (req, res) => {
  res.send(`
${getHTMLHead('Contact - Basement')}
  ${getResponsiveNav(req)}
  
  <main class="bg-black min-h-screen pt-24 pb-16">
    <div class="max-w-2xl mx-auto px-8 md:px-12 lg:px-16">
      <h1 class="text-4xl md:text-5xl font-extrabold text-white text-center mb-4">Contact Us</h1>
      <p class="text-gray-400 text-center mb-12">Get in touch with our team</p>
      
      <form method="POST" action="/contact" class="bg-gray-900/80 backdrop-blur-xl border border-blue-500/30 rounded p-8 shadow-[0_0_70px_rgba(0,102,255,0.25),0_0_110px_rgba(0,102,255,0.12),inset_0_0_35px_rgba(0,102,255,0.03)]">
        <input type="hidden" name="_csrf" value="${req.csrfToken()}">
        
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-300 mb-2">Name</label>
          <input type="text" name="name" required class="w-full px-4 py-3 bg-black/40 border border-blue-500/30 rounded text-white placeholder-gray-500 focus:border-blue-500 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all">
        </div>
        
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-300 mb-2">Email</label>
          <input type="email" name="email" required class="w-full px-4 py-3 bg-black/40 border border-blue-500/30 rounded text-white placeholder-gray-500 focus:border-blue-500 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all">
        </div>
        
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-300 mb-2">Message</label>
          <textarea name="message" required rows="6" class="w-full px-4 py-3 bg-black/40 border border-blue-500/30 rounded text-white placeholder-gray-500 focus:border-blue-500 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all resize-y"></textarea>
        </div>
        
        <button type="submit" class="w-full px-6 py-3 bg-blue-600 text-white font-bold rounded hover:bg-blue-500 hover:shadow-[0_0_30px_rgba(0,102,255,0.6)] transition-all uppercase tracking-wider text-sm">Send Message</button>
      </form>
    </div>
  </main>
  
  ${getFooter()}
  ${getScripts('nav.js')}
  `);
};

exports.submitContact = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).send(`
      ${getHTMLHead('Validation Error - Clouded Basement')}
      ${getResponsiveNav(req)}
      <main class="min-h-screen flex items-center justify-center px-4 pt-24">
        <div class="bg-gray-900/80 border border-red-500/30 rounded-lg p-8 max-w-md text-center">
          <h1 class="text-2xl font-bold text-red-400 mb-4">Validation Error</h1>
          <ul class="text-gray-300 mb-6 text-left list-disc list-inside">${errors.array().map(err => `<li>${err.msg}</li>`).join('')}</ul>
          <a href="/contact" class="inline-block px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition">Go back</a>
        </div>
      </main>
      ${getFooter()}
      ${getScripts('nav.js')}
    `);
  }
  
  const { name, email, message } = req.body;
  
  // Validate email domain is real
  const emailCheck = await validateEmailDomain(email);
  if (!emailCheck.valid) {
    return res.status(400).send(`
      ${getHTMLHead('Invalid Email - Clouded Basement')}
      ${getResponsiveNav(req)}
      <main class="min-h-screen flex items-center justify-center px-4 pt-24">
        <div class="bg-gray-900/80 border border-red-500/30 rounded-lg p-8 max-w-md text-center">
          <h1 class="text-2xl font-bold text-red-400 mb-4">Invalid Email</h1>
          <p class="text-gray-300 mb-6">${emailCheck.reason}</p>
          <a href="/contact" class="inline-block px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition">Go back</a>
        </div>
      </main>
      ${getFooter()}
      ${getScripts('nav.js')}
    `);
  }
  
  console.log('Contact form received:', { name, email, message: (message || '').substring(0, 50) + '...' });
  
  // Send email to business inbox
  const result = await sendContactEmail(name, email, message);
  
  if (result.success) {
    req.session.flashMessage = 'Your message was successfully sent! We\'ll get back to you soon.';
  } else {
    console.error('Failed to send contact email:', result.error);
    req.session.flashMessage = 'Your message was received! We\'ll get back to you soon.';
  }
  
  res.redirect('/');
};
