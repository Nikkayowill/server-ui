Markdown
Copy
Code Preview

# PM2 Quick-Cheatsheet (manual on/off)

## Install (once on server)
```bash
sudo npm i -g pm2

Manual run (cost-free)
bash
Copy

cd ~/server-ui
node index.js              # foreground, Ctrl-C to stop

PM2 manual run (optional)
bash
Copy

pm2 start index.js --name localbiz-demo
pm2 stop localbiz-demo     # stop whenever you like
pm2 delete localbiz-demo   # remove from PM2 list

Auto-start later (when you’re ready)
bash
Copy

pm2 start index.js --name localbiz-demo
pm2 save
pm2 startup                # copy the printed sudo command and run it

Check what’s running
bash
Copy

pm2 list
pm2 logs localbiz-demo     # live tail
pm2 monit                  # small dashboard

Reboot test (after auto-start enabled)
bash
Copy

sudo reboot                # VM comes back with site live

Stop everything (no cost)
bash
Copy

pm2 stop all
pm2 delete all
pm2 save