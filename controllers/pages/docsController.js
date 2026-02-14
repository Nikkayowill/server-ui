const { getHTMLHead, getScripts, getFooter, getResponsiveNav } = require('../../helpers');

exports.showDocs = (req, res) => {
  res.send(`
${getHTMLHead('Documentation - Basement')}
    <link rel="stylesheet" href="/css/docs.css">
    ${getResponsiveNav(req)}
    
    <!-- Mobile TOC toggle -->
    <button class="docs-toc-toggle" id="docsTocToggle" aria-label="Table of contents">
      <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h10M4 18h16"/></svg>
    </button>
    <button class="scroll-to-top" id="scrollToTop" aria-label="Scroll to top">
      <svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7"/></svg>
    </button>
    <div class="docs-sidebar-backdrop" id="docsSidebarBackdrop"></div>

    <div class="docs-layout">
      <!-- Sidebar TOC -->
      <aside class="docs-sidebar" id="docsSidebar">
        <div class="px-5 py-8">
          <h2 class="text-sm font-bold text-white uppercase tracking-wider mb-6">On This Page</h2>
          <nav>
            <ul class="space-y-1">
              <li><a href="#overview" class="toc-link block py-2 px-3 text-sm text-gray-300 hover:text-blue-400 hover:bg-gray-800 rounded transition-colors border-l-2 border-transparent">Overview</a></li>
              <li><a href="#architecture" class="toc-link block py-2 px-3 text-sm text-gray-300 hover:text-blue-400 hover:bg-gray-800 rounded transition-colors border-l-2 border-transparent">Architecture Overview</a></li>
              <li><a href="#provisioning" class="toc-link block py-2 px-3 text-sm text-gray-300 hover:text-blue-400 hover:bg-gray-800 rounded transition-colors border-l-2 border-transparent">Provisioning Pipeline</a></li>
              <li><a href="#deployment" class="toc-link block py-2 px-3 text-sm text-gray-300 hover:text-blue-400 hover:bg-gray-800 rounded transition-colors border-l-2 border-transparent">Deployment Methods</a></li>
              <li><a href="#security" class="toc-link block py-2 px-3 text-sm text-gray-300 hover:text-blue-400 hover:bg-gray-800 rounded transition-colors border-l-2 border-transparent">Security & Trust Model</a></li>
              <li><a href="#ownership" class="toc-link block py-2 px-3 text-sm text-gray-300 hover:text-blue-400 hover:bg-gray-800 rounded transition-colors border-l-2 border-transparent">Ownership & Control</a></li>
              <li><a href="#limitations" class="toc-link block py-2 px-3 text-sm text-gray-300 hover:text-blue-400 hover:bg-gray-800 rounded transition-colors border-l-2 border-transparent">Current Limitations</a></li>
              <li><a href="#roadmap" class="toc-link block py-2 px-3 text-sm text-gray-300 hover:text-blue-400 hover:bg-gray-800 rounded transition-colors border-l-2 border-transparent">Development Roadmap</a></li>
            </ul>
          </nav>
        </div>
      </aside>
      
      <!-- Main Content -->
      <main class="docs-content">
        <div class="docs-content-inner">
          <!-- Page Header -->
          <header class="mb-12">
            <h1 class="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">Technical&nbsp;Documentation</h1>
            <p class="text-base lg:text-lg text-gray-400 leading-relaxed">Complete technical reference for Clouded Basement — infrastructure details, deployment methods, and system&nbsp;architecture.</p>
          </header>

          <!-- Section 1: Overview -->
          <section id="overview" class="mb-16 scroll-mt-24">
            <h2 class="text-2xl lg:text-3xl font-bold text-white mb-6 pb-3 border-l-4 border-blue-500 pl-4">Overview</h2>
                
            <div class="space-y-6 text-gray-300 leading-relaxed">
              <p>
                Clouded Basement provides automated VPS provisioning on DigitalOcean infrastructure. When you complete payment, the platform creates an Ubuntu 22.04 server with a complete development environment pre-installed, including Node.js, Python, Rust, Go, Nginx, and SSL tooling.
              </p>
              
              <p>
                Each server is fully isolated with dedicated resources and a unique IP address. You receive root SSH access immediately upon provisioning. The platform handles initial setup automation but does not restrict server access or sandbox applications.
              </p>
              
              <p>
                This is not a Platform-as-a-Service (PaaS). You have complete control over the server, can install any software, modify configurations, and migrate elsewhere at any time. Clouded Basement automates provisioning and provides deployment tools, but the server itself operates as a standard VPS with no vendor lock-in.
              </p>
            </div>
              </section>
              
              <!-- Section 2: Architecture Overview -->
              <section id="architecture" class="mb-16 scroll-mt-20">
                <h2 class="text-3xl font-bold text-white mb-6 pb-3 border-l-4 border-blue-500 pl-4">Architecture Overview</h2>
                
                <div class="space-y-8">
                  <div>
                    <h3 class="text-xl font-semibold text-white mb-4">Control Plane vs Customer Server</h3>
                    <div class="space-y-4 text-gray-300 leading-relaxed">
                      <p>
                        Clouded Basement operates as a control plane that provisions and manages infrastructure. When you trigger a payment, the control plane communicates with the DigitalOcean API to create a droplet, then monitors the provisioning process until an IP address is assigned. Once provisioning completes, your server operates independently.
                      </p>
                      <p>
                        The platform stores SSH credentials to enable automated deployments and SSL certificate installation. When you use one-click deployment features, the control plane connects to your server, executes the necessary commands, and returns logs. You retain full root access and can change passwords or configurations at any time.
                      </p>
                    </div>
                  </div>
                  
                  <div class="bg-gray-900 rounded-lg p-6 border border-gray-800">
                    <h3 class="text-xl font-semibold text-white mb-4">What Clouded Basement Touches</h3>
                    <p class="text-gray-300 leading-relaxed mb-4">
                      Platform access to customer servers is limited to automation features:
                    </p>
                    <ul class="space-y-3 text-gray-300">
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1">•</span>
                        <div><strong class="text-white">Git deployments:</strong> Connects via SSH when you trigger a deployment, clones repository, installs dependencies, and configures web server</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1">•</span>
                        <div><strong class="text-white">SSL certificates:</strong> Executes certbot commands to install Let's Encrypt certificates when you enable SSL for a domain</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1">•</span>
                        <div><strong class="text-white">Server controls:</strong> Sends power on/off/restart commands to DigitalOcean API when you use dashboard controls</div>
                      </li>
                    </ul>
                  </div>
                  
                  <div class="bg-gray-900 rounded-lg p-6 border border-gray-800">
                    <h3 class="text-xl font-semibold text-white mb-4">What Clouded Basement Never Touches</h3>
                    <ul class="space-y-3 text-gray-300">
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1">•</span>
                        <div>Application data or user files (no scanning, no monitoring)</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1">•</span>
                        <div>Database contents or credentials beyond what you configure</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1">•</span>
                        <div>Application logs (stored locally on your server only)</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1">•</span>
                        <div>Network traffic or API requests your application makes</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1">•</span>
                        <div>Custom configurations you manually set via SSH</div>
                      </li>
                    </ul>
                    <p class="text-gray-300 leading-relaxed mt-6 pt-4 border-t border-gray-800">
                      Once provisioned, your server is yours. The platform does not have background processes monitoring activity, reading files, or analyzing usage patterns.
                    </p>
                  </div>
                  
                  <div class="bg-blue-950/30 border-l-4 border-blue-500 rounded-r-lg p-6">
                    <h3 class="text-white text-lg font-semibold mb-3">Security Model</h3>
                    <div class="space-y-3 text-gray-300 leading-relaxed">
                      <p>
                        SSH credentials are stored in the platform database to enable automation features. This is standard for managed hosting platforms and allows one-click deployments without requiring manual intervention.
                      </p>
                      <p>
                        <strong class="text-white">You can change your SSH password at any time</strong> via direct server access. Future deployments will prompt for new credentials if the stored password no longer works. This gives you full control over access while maintaining convenience when you need it.
                      </p>
                    </div>
                  </div>
                </div>
              </section>
              
              <!-- Section 3: Provisioning Pipeline -->
              <section id="provisioning" class="mb-16 scroll-mt-20">
                <h2 class="text-3xl font-bold text-white mb-6 pb-3 border-l-4 border-blue-500 pl-4">Provisioning Pipeline</h2>
                
                <p class="text-gray-300 leading-relaxed mb-8">
                  When you complete payment, the following automated sequence executes. Typical provisioning time is 90-120 seconds from payment to server availability.
                </p>
                
                <div class="space-y-6">
                  <div class="border-l-4 border-blue-400 pl-6 py-2">
                    <h3 class="text-lg font-semibold text-white mb-2">Step 1: Payment Validation</h3>
                    <p class="text-gray-300 leading-relaxed">
                      Stripe webhook confirms payment success and extracts plan details. The system verifies you don't already have an active server (one server per customer enforced at database level). If validation passes, provisioning begins immediately.
                    </p>
                  </div>
                  
                  <div class="border-l-4 border-blue-400 pl-6 py-2">
                    <h3 class="text-lg font-semibold text-white mb-2">Step 2: Droplet Creation</h3>
                    <p class="text-gray-300 leading-relaxed mb-4">
                      DigitalOcean API call creates a new droplet with these specifications:
                    </p>
                    <ul class="space-y-2 text-gray-300">
                      <li class="flex gap-3">
                        <span class="text-blue-400">•</span>
                        <div><strong class="text-white">Image:</strong> Ubuntu 22.04 x64 LTS</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-blue-400">•</span>
                        <div><strong class="text-white">Region:</strong> NYC3 (New York City)</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-blue-400">•</span>
                        <div><strong class="text-white">Size:</strong> Varies by plan (s-1vcpu-1gb, s-2vcpu-2gb, s-2vcpu-4gb)</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-blue-400">•</span>
                        <div><strong class="text-white">Features:</strong> Monitoring enabled, backups disabled</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-blue-400">•</span>
                        <div><strong class="text-white">Tags:</strong> clouded-basement (for inventory tracking)</div>
                      </li>
                    </ul>
                  </div>
                  
                  <div class="border-l-4 border-blue-400 pl-6 py-2">
                    <h3 class="text-lg font-semibold text-white mb-2">Step 3: Cloud-Init Execution</h3>
                    <p class="text-gray-300 leading-relaxed mb-4">
                      The droplet boots and runs a cloud-init script that installs the complete development environment. This process takes 60-90 seconds.
                    </p>
                    
                    <div class="bg-gray-900 rounded-lg p-5 mb-4">
                      <h4 class="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Packages Installed</h4>
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-300">
                        <div class="space-y-2">
                          <p><strong class="text-white">Node.js:</strong> 20.x (via NodeSource)</p>
                          <p><strong class="text-white">nvm:</strong> Latest (Node Version Manager)</p>
                          <p><strong class="text-white">Python:</strong> 3.x + pip3</p>
                          <p><strong class="text-white">Go:</strong> 1.21.6</p>
                        </div>
                        <div class="space-y-2">
                          <p><strong class="text-white">Rust:</strong> Latest stable (via rustup)</p>
                          <p><strong class="text-white">Nginx:</strong> Latest from Ubuntu repos</p>
                          <p><strong class="text-white">Certbot:</strong> Latest (Let's Encrypt)</p>
                          <p><strong class="text-white">Git:</strong> Latest + wget, curl</p>
                        </div>
                      </div>
                    </div>
                    
                    <div class="bg-gray-900 rounded-lg p-5">
                      <h4 class="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Security Configuration</h4>
                      <ul class="space-y-2 text-sm text-gray-300">
                        <li class="flex gap-3">
                          <span class="text-blue-400 mt-1">•</span>
                          <div><strong class="text-white">SSH:</strong> Root password authentication enabled (generated with 256-bit entropy)</div>
                        </li>
                        <li class="flex gap-3">
                          <span class="text-blue-400 mt-1">•</span>
                          <div><strong class="text-white">Firewall:</strong> UFW configured with ports 22 (SSH), 80 (HTTP), 443 (HTTPS) open</div>
                        </li>
                        <li class="flex gap-3">
                          <span class="text-blue-400 mt-1">•</span>
                          <div><strong class="text-white">Nginx:</strong> Default welcome page deployed to /var/www/html</div>
                        </li>
                      </ul>
                    </div>
                  </div>
                  
                  <div class="border-l-4 border-blue-400 pl-6 py-2">
                    <h3 class="text-lg font-semibold text-white mb-2">Step 4: IP Address Polling</h3>
                    <div class="space-y-3 text-gray-300 leading-relaxed">
                      <p>
                        The control plane polls the DigitalOcean API every 10 seconds to check droplet status and IP assignment. Maximum timeout is 5 minutes.
                      </p>
                      <p>
                        When the droplet reaches "active" status and has an assigned IP address, the system updates the database and sends a welcome email with your dashboard link. SSH credentials are displayed in the dashboard (never sent via email for security).
                      </p>
                    </div>
                  </div>
                  
                  <div class="border-l-4 border-blue-400 pl-6 py-2">
                    <h3 class="text-lg font-semibold text-white mb-2">Step 5: Server Ready</h3>
                    <p class="text-gray-300 leading-relaxed">
                      Your server is now fully operational. You can SSH in immediately using the credentials displayed in your dashboard. Nginx is serving a default welcome page, and all development tools are ready to use.
                    </p>
                  </div>
                </div>
                
                <div class="bg-yellow-950/20 border-l-4 border-yellow-500 rounded-r-lg p-6 mt-8">
                  <h3 class="text-white text-lg font-semibold mb-3 flex items-center gap-2">
                    Failure Handling
                  </h3>
                  <div class="space-y-3 text-gray-300 leading-relaxed">
                    <p>
                      If provisioning fails (e.g., DigitalOcean API error, network timeout), the system automatically issues a Stripe refund and marks the server as "failed" in the database for audit purposes.
                    </p>
                    <p>
                      Provisioning timeouts after 5 minutes are rare but can occur during DigitalOcean capacity issues. These require manual intervention—contact support if your server remains in "provisioning" status beyond 5 minutes.
                    </p>
                  </div>
                </div>
              </section>
              
              <!-- Section 4: Deployment Methods -->
              <section id="deployment" class="mb-16 scroll-mt-20">
                <h2 class="text-3xl font-bold text-white mb-6 pb-3 border-l-4 border-blue-500 pl-4">Deployment Methods</h2>
                
                <p class="text-gray-300 leading-relaxed mb-8">
                  Clouded Basement provides automated Git deployment for public repositories. When you paste a repository URL and trigger deployment, the platform connects to your server via SSH, clones the repository, detects the project type, installs dependencies, builds production assets, and configures the web server.
                </p>
                
                <div class="space-y-10">
                  <div>
                    <h3 class="text-xl font-semibold text-white mb-4">Supported Git Platforms</h3>
                    <p class="text-gray-300 leading-relaxed mb-4">
                      The platform supports public repositories from the following providers:
                    </p>
                    <ul class="space-y-3 text-gray-300">
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1">•</span>
                        <div><strong class="text-white">GitHub:</strong> Uses tarball API endpoint for faster cloning without Git history</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1">•</span>
                        <div><strong class="text-white">GitLab:</strong> Direct git clone over HTTPS</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1">•</span>
                        <div><strong class="text-white">Bitbucket:</strong> Direct git clone over HTTPS</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1">•</span>
                        <div><strong class="text-white">Codeberg:</strong> Direct git clone over HTTPS</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1">•</span>
                        <div><strong class="text-white">SourceHut:</strong> Direct git clone over HTTPS</div>
                      </li>
                    </ul>
                    <div class="bg-blue-950/30 border-l-4 border-blue-500 rounded-r-lg p-5 mt-5">
                      <p class="text-gray-300 leading-relaxed">
                        <strong class="text-white">Private repositories are not currently supported.</strong> The platform does not implement GitHub Personal Access Token authentication or SSH key deployment. You must make your repository public or use manual deployment via SSH.
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 class="text-xl font-semibold text-white mb-4">Project Type Detection</h3>
                    <p class="text-gray-300 leading-relaxed mb-6">
                      After cloning, the platform inspects the repository root to determine project type. Detection happens in this priority order:
                    </p>
                    
                    <div class="space-y-4">
                      <div class="bg-gray-900 border-l-4 border-blue-400 rounded-r-lg p-5">
                        <h4 class="text-white font-semibold mb-3">1. React/Vue Frontend <span class="text-gray-500 text-sm font-normal">(package.json detected)</span></h4>
                        <div class="space-y-3 text-sm text-gray-300 leading-relaxed">
                          <p>
                            Installs dependencies with npm install (--legacy-peer-deps fallback if conflicts occur). Attempts build script detection in this order: npm run build → npm run prod → npm run production.
                          </p>
                          <p>
                            Looks for built assets in: dist/ → build/ → out/. Copies entire directory to /var/www/html and configures Nginx for single-page application routing (all requests serve index.html for client-side routing).
                          </p>
                        </div>
                      </div>
                      
                      <div class="bg-gray-900 border-l-4 border-blue-400 rounded-r-lg p-5">
                        <h4 class="text-white font-semibold mb-3">2. Node.js Backend <span class="text-gray-500 text-sm font-normal">(package.json + server detection)</span></h4>
                        <div class="space-y-3 text-sm text-gray-300 leading-relaxed">
                          <p>
                            If package.json exists but no build output directory found, and files like server.js, app.js, index.js exist, treats as backend application.
                          </p>
                          <p>
                            Installs production dependencies (npm ci --production), creates systemd service, starts application, configures Nginx reverse proxy on port 3000. Application must listen on PORT environment variable (defaults to 3000 if not set).
                          </p>
                        </div>
                      </div>
                      
                      <div class="bg-gray-900 border-l-4 border-blue-400 rounded-r-lg p-5">
                        <h4 class="text-white font-semibold mb-3">3. Python <span class="text-gray-500 text-sm font-normal">(requirements.txt or setup.py)</span></h4>
                        <div class="space-y-3 text-sm text-gray-300 leading-relaxed">
                          <p>
                            Creates Python virtual environment, installs dependencies via pip3. Looks for WSGI application file (wsgi.py, app.py, main.py).
                          </p>
                          <p>
                            Configures Gunicorn as WSGI server with 4 workers, creates systemd service, starts application, configures Nginx reverse proxy on port 8000.
                          </p>
                        </div>
                      </div>
                      
                      <div class="bg-gray-900 border-l-4 border-blue-400 rounded-r-lg p-5">
                        <h4 class="text-white font-semibold mb-3">4. Rust <span class="text-gray-500 text-sm font-normal">(Cargo.toml)</span></h4>
                        <div class="space-y-3 text-sm text-gray-300 leading-relaxed">
                          <p>
                            Builds release binary with cargo build --release. Locates compiled binary in target/release/.
                          </p>
                          <p>
                            Creates systemd service, starts application, configures Nginx reverse proxy on port 8080. Application must bind to 0.0.0.0 (not 127.0.0.1) to accept external connections.
                          </p>
                        </div>
                      </div>
                      
                      <div class="bg-gray-900 border-l-4 border-blue-400 rounded-r-lg p-5">
                        <h4 class="text-white font-semibold mb-3">5. Go <span class="text-gray-500 text-sm font-normal">(go.mod)</span></h4>
                        <div class="space-y-3 text-sm text-gray-300 leading-relaxed">
                          <p>
                            Builds binary with go build. Locates main package and compiles.
                          </p>
                          <p>
                            Creates systemd service, starts application, configures Nginx reverse proxy on port 8080. Application must bind to 0.0.0.0 and read PORT environment variable.
                          </p>
                        </div>
                      </div>
                      
                      <div class="bg-gray-900 border-l-4 border-blue-400 rounded-r-lg p-5">
                        <h4 class="text-white font-semibold mb-3">6. Static HTML <span class="text-gray-500 text-sm font-normal">(index.html)</span></h4>
                        <p class="text-sm text-gray-300 leading-relaxed">
                          Copies all files directly to /var/www/html. No build step. Configures Nginx to serve files with proper MIME types.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 class="text-xl font-semibold text-white mb-4">Environment Variables</h3>
                    <div class="space-y-4 text-gray-300 leading-relaxed">
                      <p>
                        You can configure environment variables through the dashboard. The platform creates a .env file in your project directory before starting the application. Variables are injected at deployment time, not stored in the repository.
                      </p>
                      <p>
                        Values are shell-escaped to prevent injection attacks. Secrets like API keys are sanitized from deployment logs (pattern matching removes Stripe keys, AWS credentials, database URLs, GitHub tokens, and other common secret formats).
                      </p>
                    </div>
                  </div>
                  
                  <div class="bg-gray-900 rounded-lg p-6 border border-gray-800">
                    <h3 class="text-lg font-semibold text-white mb-4">Health Checks</h3>
                    <p class="text-gray-300 leading-relaxed mb-4">
                      After deployment completes, the platform verifies the application is running:
                    </p>
                    <ul class="space-y-3 text-gray-300">
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1">•</span>
                        <div><strong class="text-white">Static sites:</strong> HTTP request to http://your-server-ip/ expects 200 OK response</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1">•</span>
                        <div><strong class="text-white">Backend applications:</strong> Systemd service status check expects "active (running)" state</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1">•</span>
                        <div><strong class="text-white">Retry logic:</strong> 3 attempts with 2-second intervals before marking deployment as failed</div>
                      </li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 class="text-xl font-semibold text-white mb-4">Deployment Logs</h3>
                    <p class="text-gray-300 leading-relaxed mb-4">
                      All deployment steps are logged and displayed in your dashboard in real-time. Logs include:
                    </p>
                    <ul class="space-y-3 text-gray-300">
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1">•</span>
                        <div>Repository clone progress and detected branch (main → master fallback)</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1">•</span>
                        <div>Project type detection results</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1">•</span>
                        <div>Dependency installation output (npm, pip, cargo, go)</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1">•</span>
                        <div>Build script execution output</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1">•</span>
                        <div>Web server configuration changes</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1">•</span>
                        <div>Health check results</div>
                      </li>
                    </ul>
                    <p class="text-gray-300 leading-relaxed mt-4">
                      Sensitive data like API keys and passwords are automatically redacted from logs using regex pattern matching.
                    </p>
                  </div>
                  
                  <div class="bg-yellow-950/20 border-l-4 border-yellow-500 rounded-r-lg p-6">
                    <h3 class="text-white text-lg font-semibold mb-4 flex items-center gap-2">
                      Limitations
                    </h3>
                    <ul class="space-y-3 text-gray-300">
                      <li class="flex gap-3">
                        <span class="text-yellow-400 mt-1">•</span>
                        <div><strong class="text-white">Repository size:</strong> 100MB maximum (enforced during clone/download)</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-yellow-400 mt-1">•</span>
                        <div><strong class="text-white">Private repositories:</strong> Currently only public repos supported. Private repo authentication is planned but requires secure token storage and testing. Solo dev, so no timeline yet.</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-yellow-400 mt-1">•</span>
                        <div><strong class="text-white">Build timeouts:</strong> 10-minute maximum for dependency installation and builds</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-yellow-400 mt-1">•</span>
                        <div><strong class="text-white">Database setup:</strong> Must be configured manually via SSH—no automated database provisioning</div>
                      </li>
                    </ul>
                  </div>
                </div>
              </section>
              
              <!-- Section 5: Security & Trust Model -->
              <section id="security" class="mb-16 scroll-mt-20">
                <h2 class="text-3xl font-bold text-white mb-6 pb-3 border-l-4 border-blue-500 pl-4">Security & Trust Model</h2>
                
                <div class="space-y-8">
                  <div>
                    <h3 class="text-xl font-semibold text-white mb-4">Stored Credentials</h3>
                    <div class="space-y-4 text-gray-300 leading-relaxed">
                      <p>
                        SSH credentials (IP address, username, password) are stored in the platform database in plaintext. This is required for automated deployment and SSL certificate installation features to function. Without stored credentials, the platform cannot connect to your server to execute deployment commands.
                      </p>
                      <p>
                        This is standard practice for managed hosting platforms—services like Heroku, Render, and Vercel all store deployment credentials to enable automation. The trade-off is convenience (one-click deployments) versus manual SSH key management.
                      </p>
                      <p>
                        <strong class="text-white">You can change your SSH password at any time.</strong> Log into your server via SSH and run <code class="bg-gray-900 px-2 py-1 rounded text-sm text-blue-400">passwd</code> to set a new password. Future deployments will fail until you provide the new credentials in your dashboard, giving you full control over access.
                      </p>
                    </div>
                  </div>
                  
                  <div class="bg-gray-900 rounded-lg p-6 border border-gray-800">
                    <h3 class="text-lg font-semibold text-white mb-4">Database Security</h3>
                    <p class="text-gray-300 leading-relaxed mb-4">
                      Platform database credentials are protected with:
                    </p>
                    <ul class="space-y-3 text-gray-300">
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1">•</span>
                        <div><strong class="text-white">Password hashing:</strong> User passwords hashed with bcrypt (10 rounds) before storage</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1">•</span>
                        <div><strong class="text-white">Parameterized queries:</strong> All database operations use parameterized queries to prevent SQL injection</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1">•</span>
                        <div><strong class="text-white">Session security:</strong> HTTP-only cookies prevent JavaScript access to session tokens</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1">•</span>
                        <div><strong class="text-white">CSRF protection:</strong> All form submissions require valid CSRF tokens</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1">•</span>
                        <div><strong class="text-white">Rate limiting:</strong> Brute-force protection on authentication endpoints</div>
                      </li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 class="text-xl font-semibold text-white mb-4">Platform Access Transparency</h3>
                    <p class="text-gray-300 leading-relaxed mb-4">
                      The platform connects to your server only when you explicitly trigger an action:
                    </p>
                    <ul class="space-y-3 text-gray-300">
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1">•</span>
                        <div><strong class="text-white">Git deployment:</strong> When you click "Deploy from Git" button in dashboard</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1">•</span>
                        <div><strong class="text-white">SSL installation:</strong> When you click "Enable SSL" for a domain</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1">•</span>
                        <div><strong class="text-white">Database setup:</strong> When you click "Setup Database" (if applicable)</div>
                      </li>
                    </ul>
                    <p class="text-gray-300 leading-relaxed mt-4">
                      There are no background processes monitoring your server, reading files, or analyzing traffic. The control plane only acts when you initiate an operation through the dashboard.
                    </p>
                  </div>
                  
                  <div>
                    <h3 class="text-xl font-semibold text-white mb-4">Audit Trail Limitations</h3>
                    <div class="space-y-4 text-gray-300 leading-relaxed">
                      <p>
                        Deployment logs are stored in the platform database and displayed in your dashboard. These logs include command outputs but with secrets automatically redacted (API keys, tokens, passwords matched via regex patterns).
                      </p>
                      <p>
                        <strong class="text-white">What is NOT logged:</strong> Server access outside of platform-triggered deployments is not tracked. If you SSH directly into your server and make changes manually, those actions are not visible to the platform. Only operations initiated through the dashboard appear in deployment history.
                      </p>
                    </div>
                  </div>
                  
                  <div class="bg-blue-950/30 border-l-4 border-blue-500 rounded-r-lg p-6">
                    <h3 class="text-white text-lg font-semibold mb-4">Trust Model Summary</h3>
                    <p class="text-gray-300 leading-relaxed mb-4">
                      Clouded Basement operates on a <strong class="text-white">"convenience with transparency"</strong> security model:
                    </p>
                    <ul class="space-y-3 text-gray-300">
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1">•</span>
                        <div>Credentials stored for automation features (industry standard practice)</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1">•</span>
                        <div>You can revoke platform access anytime by changing SSH password</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1">•</span>
                        <div>Platform only connects when you trigger an action explicitly</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1">•</span>
                        <div>No background monitoring or file scanning</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1">•</span>
                        <div>Open about what is stored and why</div>
                      </li>
                    </ul>
                    <p class="text-gray-300 leading-relaxed mt-6 pt-4 border-t border-blue-800/50">
                      This is a solo-founder operation. I'm not harvesting data, training AI models on your code, or selling information. The business model is simple: you pay for server hosting, I provision and maintain infrastructure. Stored credentials exist solely to enable the features you're paying for.
                    </p>
                  </div>
                </div>
              </section>
              
              <!-- Section 6: Ownership & Control -->
              <section id="ownership" class="mb-16 scroll-mt-20">
                <h2 class="text-3xl font-bold text-white mb-6 pb-3 border-l-4 border-blue-500 pl-4">Ownership & Control</h2>
                
                <div class="space-y-8">
                  <div>
                    <h3 class="text-xl font-semibold text-white mb-4">Full Root Access</h3>
                    <div class="space-y-4 text-gray-300 leading-relaxed">
                      <p>
                        You receive root SSH access immediately upon provisioning. There are no restrictions, sandboxing, or custom kernels. This is a standard Ubuntu 22.04 VPS with full privileges—you can install any software, modify system configurations, change firewall rules, add users, or wipe the server entirely.
                      </p>
                      <p>
                        Clouded Basement automation scripts do not lock files, prevent package installation, or restrict system access in any way. If you want to uninstall Nginx and use Apache instead, install Docker manually, or run your own deployment tools—you can.
                      </p>
                    </div>
                  </div>
                  
                  <div class="bg-gray-900 rounded-lg p-6 border border-gray-800">
                    <h3 class="text-lg font-semibold text-white mb-4">No Vendor Lock-In</h3>
                    <div class="space-y-4 text-gray-300 leading-relaxed">
                      <p>
                        Your server is a DigitalOcean droplet provisioned under your indirect control. The droplet belongs to Clouded Basement's DigitalOcean account for billing simplicity, but the infrastructure is standard and portable.
                      </p>
                      <p>
                        <strong class="text-white">Migration path:</strong> If you decide to leave Clouded Basement, you can:
                      </p>
                      <ul class="space-y-3 text-gray-300 mt-4">
                        <li class="flex gap-3">
                          <span class="text-blue-400 mt-1">•</span>
                          <div>Create a snapshot of your server via DigitalOcean support (contact support@cloudedbasement.ca for coordination)</div>
                        </li>
                        <li class="flex gap-3">
                          <span class="text-blue-400 mt-1">•</span>
                          <div>Recreate the environment on your own VPS by documenting installed packages (use <code class="bg-black px-2 py-1 rounded text-xs text-blue-400">dpkg -l</code> to list)</div>
                        </li>
                        <li class="flex gap-3">
                          <span class="text-blue-400 mt-1">•</span>
                          <div>Use standard backup tools (rsync, tar) to copy files to another server</div>
                        </li>
                        <li class="flex gap-3">
                          <span class="text-blue-400 mt-1">•</span>
                          <div>Export databases with mysqldump or pg_dump and restore elsewhere</div>
                        </li>
                      </ul>
                      <p class="mt-4">
                        There is no proprietary runtime, custom deployment format, or platform-specific database structure. Your application code and data are completely portable.
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 class="text-xl font-semibold text-white mb-4">Password Control</h3>
                    <div class="space-y-4 text-gray-300 leading-relaxed">
                      <p>
                        You can change your SSH password at any time via direct server access. Run <code class="bg-gray-900 px-2 py-1 rounded text-sm text-blue-400">passwd</code> as root to set a new password. The platform will continue to attempt connections with the old stored credentials until you update them in the dashboard.
                      </p>
                      <p>
                        <strong class="text-white">Disabling platform access:</strong> Changing your password without updating the dashboard effectively locks out the control plane. Automated deployments and SSL installation will fail until you provide new credentials. This gives you a manual killswitch for platform automation if needed.
                      </p>
                    </div>
                  </div>
                  
                  <div class="bg-gray-900 rounded-lg p-6 border border-gray-800">
                    <h3 class="text-xl font-semibold text-white mb-5">Server Management Controls</h3>
                    <p class="text-gray-300 leading-relaxed mb-5">
                      The dashboard provides power controls that interact with the DigitalOcean API:
                    </p>
                    
                    <div class="space-y-4">
                      <div class="border-l-4 border-blue-400 pl-4">
                        <p class="text-white font-semibold mb-2">Power Off</p>
                        <p class="text-gray-300 text-sm leading-relaxed">
                          Sends graceful shutdown signal to droplet. Server stops but disk persists. You are not billed for compute hours while powered off (only storage costs apply). Data remains intact.
                        </p>
                      </div>
                      
                      <div class="border-l-4 border-blue-400 pl-4">
                        <p class="text-white font-semibold mb-2">Power On</p>
                        <p class="text-gray-300 text-sm leading-relaxed">
                          Boots the droplet. Server resumes from powered-off state with all data and configurations intact. IP address remains the same (static assignment).
                        </p>
                      </div>
                      
                      <div class="border-l-4 border-blue-400 pl-4">
                        <p class="text-white font-semibold mb-2">Restart</p>
                        <p class="text-gray-300 text-sm leading-relaxed">
                          Reboots the server. Equivalent to running <code class="bg-black px-1 py-0.5 rounded text-xs text-blue-400">reboot</code> via SSH. Useful for applying kernel updates or resetting stuck processes.
                        </p>
                      </div>
                      
                      <div class="border-l-4 border-red-500 pl-4">
                        <p class="text-white font-semibold mb-2">Delete Server</p>
                        <p class="text-gray-300 text-sm leading-relaxed">
                          Permanently destroys the droplet via DigitalOcean API. All data is lost immediately and cannot be recovered. Your subscription ends and no further charges occur.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 class="text-xl font-semibold text-white mb-4">What "Ownership" Means</h3>
                    <div class="space-y-4 text-gray-300 leading-relaxed">
                      <p>
                        The DigitalOcean droplet is created under Clouded Basement's account for billing aggregation. You do not have direct DigitalOcean dashboard access to the droplet.
                      </p>
                      <p>
                        <strong class="text-white">In practical terms:</strong>
                      </p>
                      <ul class="space-y-3 text-gray-300">
                        <li class="flex gap-3">
                          <span class="text-blue-400 mt-1">•</span>
                          <div>You have root SSH access with full system control</div>
                        </li>
                        <li class="flex gap-3">
                          <span class="text-blue-400 mt-1">•</span>
                          <div>Your data and applications are completely portable (standard Linux environment)</div>
                        </li>
                        <li class="flex gap-3">
                          <span class="text-blue-400 mt-1">•</span>
                          <div>You can change SSH password anytime to disable platform automation</div>
                        </li>
                        <li class="flex gap-3">
                          <span class="text-blue-400 mt-1">•</span>
                          <div>You control when the server is powered on/off or deleted via dashboard</div>
                        </li>
                        <li class="flex gap-3">
                          <span class="text-blue-400 mt-1">•</span>
                          <div>No vendor-specific dependencies in your application stack</div>
                        </li>
                      </ul>
                      <p class="mt-4">
                        This is a managed provisioning layer over standard VPS infrastructure. The platform handles initial setup, deployment automation, and SSL configuration, but does not restrict or modify the underlying Linux system beyond initial configuration.
                      </p>
                    </div>
                  </div>
                </div>
              </section>
              
              <!-- Section 7: Current Limitations -->
              <section id="limitations" class="mb-16 scroll-mt-20">
                <h2 class="text-3xl font-bold text-white mb-6 pb-3 border-l-4 border-blue-500 pl-4">Current Limitations</h2>
                
                <p class="text-gray-300 leading-relaxed mb-8">
                  Clouded Basement is a solo-founder operation. The platform prioritizes working features over comprehensive coverage. These limitations are intentional trade-offs for simplicity and maintainability.
                </p>
                
                <div class="space-y-8">
                  <div>
                    <h3 class="text-xl font-semibold text-white mb-4">Infrastructure</h3>
                    <ul class="space-y-4 text-gray-300">
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1 flex-shrink-0">•</span>
                        <div>
                          <strong class="text-white">Single region:</strong> All servers provision in NYC3 (New York). The dashboard shows region selection UI, but the backend ignores it and hardcodes NYC3. Multi-region support requires additional testing and geographic load balancing complexity.
                        </div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1 flex-shrink-0">•</span>
                        <div>
                          <strong class="text-white">One server per customer:</strong> Database constraint enforces single server limit. No support for multiple servers, staging environments, or load-balanced clusters. This is a deliberate scope limitation for early-stage customers.
                        </div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1 flex-shrink-0">•</span>
                        <div>
                          <strong class="text-white">Automated backups enabled:</strong> DigitalOcean weekly backups are active on all droplets. Backups rotate automatically (4 most recent kept). Restore requires manual coordination with support—contact support@cloudedbasement.ca if you need a server restored from backup.
                        </div>
                      </li>
                    </ul>
                  </div>
                  
                  <div class="bg-gray-900 rounded-lg p-6 border border-gray-800">
                    <h3 class="text-lg font-semibold text-white mb-4">Deployment & Development</h3>
                    <ul class="space-y-4 text-gray-300">
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1 flex-shrink-0">•</span>
                        <div>
                          <strong class="text-white">Public repositories only:</strong> Private repo support requires GitHub Personal Access Token storage and OAuth flow. Planned feature, no timeline. Use manual deployment via SSH for private code.
                        </div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1 flex-shrink-0">•</span>
                        <div>
                          <strong class="text-white">No Docker support:</strong> Containers add orchestration complexity, security isolation concerns, and resource overhead. Not currently planned. Install Docker manually via SSH if needed, but platform deployments won't use it.
                        </div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1 flex-shrink-0">•</span>
                        <div>
                          <strong class="text-white">100MB repository limit:</strong> Prevents long clone times and disk space abuse. Large monorepos or projects with heavy assets won't deploy. Use .gitignore for node_modules, build artifacts, and media files.
                        </div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1 flex-shrink-0">•</span>
                        <div>
                          <strong class="text-white">No CI/CD pipelines:</strong> Deployment is triggered manually through dashboard. No GitHub Actions integration, webhooks, or automatic deploys on git push. You must click "Deploy from Git" each time.
                        </div>
                      </li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 class="text-xl font-semibold text-white mb-4">Account & Billing</h3>
                    <ul class="space-y-4 text-gray-300">
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1 flex-shrink-0">•</span>
                        <div>
                          <strong class="text-white">No plan changes:</strong> Cannot upgrade/downgrade plans after provisioning. Must delete existing server and create new one with different plan. Refunds handled manually via Stripe dashboard—contact support.
                        </div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1 flex-shrink-0">•</span>
                        <div>
                          <strong class="text-white">Single payment method:</strong> Stripe only. No cryptocurrency, PayPal, or wire transfers. Credit/debit card required.
                        </div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1 flex-shrink-0">•</span>
                        <div>
                          <strong class="text-white">3-day trial enforcement:</strong> Servers power off automatically 3 days after provisioning if no payment received. Destroyed permanently after 7 more days. Trial system runs every 6 hours—not real-time.
                        </div>
                      </li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 class="text-xl font-semibold text-white mb-4">Support & Reliability</h3>
                    <ul class="space-y-4 text-gray-300">
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1 flex-shrink-0">•</span>
                        <div>
                          <strong class="text-white">Solo founder support:</strong> No 24/7 support team. Response time typically same-day during Atlantic Time business hours. Urgent issues may take several hours if I'm asleep or unavailable.
                        </div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1 flex-shrink-0">•</span>
                        <div>
                          <strong class="text-white">No SLA guarantee:</strong> Platform uptime is best-effort. DigitalOcean infrastructure is reliable, but control plane issues (database downtime, deployment system failures) may prevent dashboard access or new deployments temporarily.
                        </div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1 flex-shrink-0">•</span>
                        <div>
                          <strong class="text-white">Manual intervention required:</strong> Some failure modes (provisioning timeout, corrupted deployment, API rate limits) require manual investigation. Automatic retry logic exists but not comprehensive.
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
              </section>
              
              <!-- Section 8: Development Roadmap -->
              <section id="roadmap" class="mb-16 scroll-mt-20">
                <h2 class="text-3xl font-bold text-white mb-6 pb-3 border-l-4 border-blue-500 pl-4">Development Roadmap</h2>
                
                <p class="text-gray-300 leading-relaxed mb-10">
                  Solo founder. No bullshit timelines. This platform is feature-complete for launch. New features get built when real customers ask for them, not before.
                </p>

                <div class="space-y-8">
                  <!-- What's Working Now -->
                  <div class="bg-green-950/20 border-l-4 border-green-500 rounded-r-lg p-6">
                    <h3 class="text-xl font-semibold text-white mb-5 flex items-center gap-2">
                      What's Working Now
                    </h3>
                    <ul class="space-y-4 text-gray-300">
                      <li class="flex gap-3">
                        <span class="text-green-400 mt-1 flex-shrink-0">•</span>
                        <div><strong class="text-white">Automated VPS provisioning:</strong> Ubuntu 22.04 droplet ready in 90-120 seconds with Node 20.x, Python 3, Rust, Go 1.21.6, Nginx, Certbot pre-installed</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-green-400 mt-1 flex-shrink-0">•</span>
                        <div><strong class="text-white">Git deployment:</strong> 6 project types supported (React/Vue frontend, Node.js backend, Python, Rust, Go, Static HTML). GitHub via tarball download, other hosts via git clone. 100MB repository limit enforced.</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-green-400 mt-1 flex-shrink-0">•</span>
                        <div><strong class="text-white">GitHub auto-deploy:</strong> Push to main/master and your site redeploys automatically. HMAC SHA-256 webhook verification, per-server and per-domain webhook support, enable/disable from the dashboard.</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-green-400 mt-1 flex-shrink-0">•</span>
                        <div><strong class="text-white">Auto-assigned subdomains:</strong> Every deployment gets a Vercel-style subdomain (yourapp-123.cloudedbasement.ca) with DNS records created automatically via DigitalOcean API.</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-green-400 mt-1 flex-shrink-0">•</span>
                        <div><strong class="text-white">One-click SSL:</strong> Certbot automation via SSH, Let's Encrypt certificates installed in 60 seconds, auto-renewal configured. Template-based Nginx config generation for static and proxy setups.</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-green-400 mt-1 flex-shrink-0">•</span>
                        <div><strong class="text-white">Stripe subscription billing:</strong> Embedded checkout with 3D Secure support. Recurring subscriptions with automatic renewal. Webhook handling for payments, failures, refunds, and cancellations. Server auto-provisioned on payment success.</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-green-400 mt-1 flex-shrink-0">•</span>
                        <div><strong class="text-white">Server controls:</strong> Power on/off/restart/delete via DigitalOcean API. No SSH required for power management. Server deletion cancels Stripe subscription and destroys droplet automatically.</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-green-400 mt-1 flex-shrink-0">•</span>
                        <div><strong class="text-white">Trial system:</strong> 3-day trial from provisioning. Automatic power-off at day 3, permanent destruction at day 10. Abuse prevention via IP tracking, browser fingerprinting, and daily caps.</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-green-400 mt-1 flex-shrink-0">•</span>
                        <div><strong class="text-white">Weekly backups:</strong> DigitalOcean automated snapshots enabled. 4 most recent backups retained. Restore requires manual coordination with support.</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-green-400 mt-1 flex-shrink-0">•</span>
                        <div><strong class="text-white">Environment variables:</strong> Secure injection during deployment. Shell-escaped, stored in .env file. Secrets sanitized from deployment logs via regex pattern matching.</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-green-400 mt-1 flex-shrink-0">•</span>
                        <div><strong class="text-white">Health checks:</strong> 3 retries at 2-second intervals. Static sites check HTTP 200. Backend services check systemd status.</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-green-400 mt-1 flex-shrink-0">•</span>
                        <div><strong class="text-white">Deployment history:</strong> All deployment logs stored in database with timestamps. Real-time log streaming during active deployments. Deployment deletion cleans up DNS records automatically.</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-green-400 mt-1 flex-shrink-0">•</span>
                        <div><strong class="text-white">Domain management:</strong> Add unlimited custom domains via dashboard. DNS configuration instructions displayed. Per-domain auto-deploy with individual webhook secrets. Admin panel with full CRUD operations.</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-green-400 mt-1 flex-shrink-0">•</span>
                        <div><strong class="text-white">One-click database provisioning:</strong> PostgreSQL and MongoDB installation via SSH automation. Takes 2-3 minutes. Generates credentials, creates users, configures authentication. Connection strings displayed in dashboard.</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-green-400 mt-1 flex-shrink-0">•</span>
                        <div><strong class="text-white">Support tickets:</strong> Submit tickets directly from the dashboard. Email notification sent to support team.</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-green-400 mt-1 flex-shrink-0">•</span>
                        <div><strong class="text-white">SSL health monitoring:</strong> Background reconciliation job runs every 30 minutes checking DNS resolution, certificate existence via SSH, and TLS handshake for every domain. Tracks six states (none, pending, active, orphaned, expired, unreachable). Auto-SSL provisioning checks every 5 minutes for domains ready for certificates. Granular status dashboard for admins and customers coming soon.</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-green-400 mt-1 flex-shrink-0">•</span>
                        <div><strong class="text-white">Managed server updates:</strong> Admin creates bash scripts (security patches, config changes, feature updates) that go through a draft → tested → released workflow. Scripts are validated against 30+ dangerous patterns and SHA-256 hashed for integrity. Admin tests on a single server before release, then can mass-push to all servers with rate limiting. Global kill switch for emergencies. Customers can apply pending updates from their dashboard.</div>
                      </li>
                    </ul>
                  </div>

                  <!-- Actively Being Built -->
                  <div class="bg-gray-900 rounded-lg p-6 border border-gray-800">
                    <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      Actively Being Built
                    </h3>
                    <p class="text-gray-300 mb-4">
                      Platform is live. Current focus: <strong class="text-white">UI polish, admin tooling, and features customers are asking for</strong>.
                    </p>
                    <ul class="space-y-3 text-gray-300">
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1 flex-shrink-0">•</span>
                        <div>SSL status dashboard — surfacing the collected health data (DNS validity, cert status, reachability) in the admin and customer UI</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1 flex-shrink-0">•</span>
                        <div>Homepage and landing page refinements</div>
                      </li>
                    </ul>
                  </div>

                  <!-- Planned Features -->
                  <div class="bg-gray-900 rounded-lg p-6 border border-gray-800">
                    <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      Planned Features
                    </h3>
                    <p class="text-gray-300 mb-5 italic">
                      These get built when customers need them. No fixed timeline (solo dev).
                    </p>
                    <ul class="space-y-4 text-gray-300">
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1 flex-shrink-0">•</span>
                        <div>
                          <strong class="text-white">Private repository support:</strong> GitHub Personal Access Token authentication. Requires secure token storage, OAuth flow implementation, and testing with private repos. Currently only public repos supported via tarball download.
                        </div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1 flex-shrink-0">•</span>
                        <div>
                          <strong class="text-white">Multi-region expansion:</strong> Currently hardcoded to NYC3 (New York). Adding SFO3 (San Francisco), LON1 (London), SGP1 (Singapore) requires geographic testing, latency verification, and UI updates. Dashboard already has region selector—backend ignores it.
                        </div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1 flex-shrink-0">•</span>
                        <div>
                          <strong class="text-white">Plan upgrades/downgrades:</strong> Change server size without destroying droplet. Requires DigitalOcean resize API integration, downtime coordination, and database migration logic. Currently must delete server and create new one.
                        </div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-blue-400 mt-1 flex-shrink-0">•</span>
                        <div>
                          <strong class="text-white">Deployment size increase:</strong> Raise 100MB tarball limit to 250MB or 500MB. Requires storage impact analysis and clone timeout adjustments (currently 15-minute SSH timeout).
                        </div>
                      </li>
                    </ul>
                  </div>

                  <!-- Under Consideration -->
                  <div class="bg-gray-900 rounded-lg p-6 border border-gray-800">
                    <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      Under Consideration
                    </h3>
                    <p class="text-gray-300 mb-5">
                      Might build based on customer demand. Not committed.
                    </p>
                    <ul class="space-y-3 text-gray-300">
                      <li class="flex gap-3">
                        <span class="text-gray-500 mt-1 flex-shrink-0">•</span>
                        <div><strong class="text-white">Multiple servers per customer:</strong> Lift one-server database constraint. Staging/production environments. Requires billing changes (per-server pricing vs per-account).</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-gray-500 mt-1 flex-shrink-0">•</span>
                        <div><strong class="text-white">Team collaboration:</strong> Shared server access for dev teams. Multiple user accounts per server. Role-based permissions.</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-gray-500 mt-1 flex-shrink-0">•</span>
                        <div><strong class="text-white">Redis caching layer:</strong> One-click Redis installation for session storage and caching. Similar to current PostgreSQL/MongoDB provisioning.</div>
                      </li>
                      <li class="flex gap-3">
                        <span class="text-gray-500 mt-1 flex-shrink-0">•</span>
                        <div><strong class="text-white">Firewall management UI:</strong> Open/close ports beyond default 22/80/443. Currently requires manual SSH and ufw commands.</div>
                      </li>
                    </ul>
                  </div>

                  <!-- Philosophy Callout -->
                  <div class="bg-blue-950/30 border-l-4 border-blue-500 rounded-r-lg p-6">
                    <h3 class="text-white text-lg font-semibold mb-4">Development Philosophy</h3>
                    <div class="space-y-4 text-gray-300 leading-relaxed">
                      <p>
                        This platform solves one problem well: <strong class="text-white">simple VPS hosting with automated Git deployment</strong>. It won't do everything. If you need enterprise features, compliance certifications, or complex orchestration, use AWS/GCP/Azure. This is for developers who want a server running their code, not a platform engineering team.
                      </p>
                      <p>
                        Features get prioritized based on <strong class="text-white">real customer needs, not theoretical roadmaps</strong>. If 10 customers ask for private repo support, it gets built. If nobody asks for Kubernetes, it doesn't get built. This keeps the platform focused, maintainable, and actually useful instead of feature-bloated.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

            </div>
          </main>
        </div>
    
    ${getFooter()}
    ${getScripts('nav.js', 'docs-toc.js')}
  `);
};
