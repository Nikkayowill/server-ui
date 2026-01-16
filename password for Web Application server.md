password for Web Application server project



SUDO password: newuser



[Web server url](http://68.183.203.226:3000)



SHA256:s3rrEcG3xIXJBrpBLK+6I6Awb/BaJQxrQ/UsTn5YTuk deploy@localbiz - ssh key



ghp\_RK2DG63yqJVHiDDt8Jg3vX0wYNGfLd16rpaK - GitHub personal key





sk\_live\_51Rm5j7BSxf4y7vL55EiHN9JKcDIeyn3dnSGUVCbapkGR9AevYK0aC1ArLe4SbZUsCKBB5sM5YmSdE7xyrt6YqIPz000FCTXH4V - Stripe key

--

--



--

--

**How to reactivate server later**



SSH: ssh deploy@68.183.203.226

Start:

bash

Copy



cd ~/server-ui

npm install   # only if deps changed

node index.js



Browse: http://68.183.203.226:3000

Stop: Ctrl-C when you’re done recording—no cost while it’s off.

Create server-autostart.sh in your local server-ui folder, paste everything below, save, commit, push—then it’s always in the repo for copy-paste on the Droplet.

bash

Copy

## --

## --

\#!/bin/bash

\# Save as server-autostart.sh  (run once as deploy user)

\# Makes the demo start on boot and restart if it crashes.



APP\_DIR=$HOME/server-ui

SERVICE\_NAME=localbiz-demo

PORT=3000



\# 1. stop any old placeholder service

sudo systemctl stop your-old-service-name 2>/dev/null || true

sudo systemctl disable your-old-service-name 2>/dev/null || true



\# 2. systemd unit file

sudo tee /etc/systemd/system/$SERVICE\_NAME.service > /dev/null <<EOF

\[Unit]

Description=LocalBiz Demo Server

After=network.target



\[Service]

Type=simple

User=deploy

WorkingDirectory=$APP\_DIR

ExecStart=/usr/bin/node index.js

Restart=on-failure

RestartSec=5

Environment=NODE\_ENV=production

StandardOutput=journal

StandardError=journal



\[Install]

WantedBy=multi-user.target

EOF



\# 3. reload systemd and enable

sudo systemctl daemon-reload

sudo systemctl enable $SERVICE\_NAME

sudo systemctl start $SERVICE\_NAME



\# 4. status check

sudo systemctl status $SERVICE\_NAME



Usage (one-time on Droplet):

bash

Copy



chmod +x server-autostart.sh

./server-autostart.sh



The service is now active and will auto-start on boot.

To stop / restart later:

bash

Copy



sudo systemctl stop localbiz-demo

sudo systemctl start localbiz-demo

sudo systemctl restart localbiz-demo



Costs nothing while the VM is off; starts automatically when you power the Droplet back on.

