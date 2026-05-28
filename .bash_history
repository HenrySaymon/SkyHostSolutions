clear
apt update && apt upgrade -y
clear
apt install curl wget git ufw nano -y
clear
apt remove docker docker-engine docker.io containerd runc -y
clear
apt install ca-certificates gnupg lsb-release -y
clear
mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo   "deb [arch=$(dpkg --print-architecture) \
  signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/debian \
  $(lsb_release -cs) stable" |   tee /etc/apt/sources.list.d/docker.list > /dev/null
apt update
clear
apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin -y
clear
docker --version
docker compose version
clear
systemctl enable docker
systemctl start docker
clear
mkdir -p /opt/funkwhale
cd /opt/funkwhale
clear
wget https://dev.funkwhale.audio/funkwhale/funkwhale/-/raw/stable/deploy/docker-compose/docker-compose.yml
clera
clear
wget https://dev.funkwhale.audio/funkwhale/funkwhale/-/raw/stable/deploy/docker-compose/docker-compose.yml
clear
wget https://dev.funkwhale.audio/funkwhale/funkwhale/-/raw/stable/deploy/docker-compose/docker-compose.yml
clear
export FUNKWHALE_VERSION=2.0.1
curl -L -o docker-compose.yml "https://dev.funkwhale.audio/funkwhale/funkwhale/raw/${FUNKWHALE_VERSION}/deploy/docker-compose.yml"
ls -lah
clear
mkdir -p data/{static,media,music}
nano .env
clear
openssl rand -hex 45
nano .env
clear
docker-compose pull
clera
clear
docker compose pull
cd /opt/funkwhale
rm -f docker-compose.yml
wget -O docker-compose.yml https://raw.githubusercontent.com/funkwhale/docker/main/docker-compose.yml
cat docker-compose.yml
clear
export FUNKWHALE_VERSION=2.0.1
curl -L -o docker-compose.yml https://dev.funkwhale.audio/funkwhale/funkwhale/-/raw/${FUNKWHALE_VERSION}/deploy/docker-compose/docker-compose.yml
nano .env
clear
docker compose pull
nano docker-compose.yml
rm -f docker-compose.yml
ls
clear
wget https://dev.funkwhale.audio/funkwhale/funkwhale/-/raw/stable/deploy/docker-compose.yml
clear
docker compose pull
clear
wget https://go.dev/dl/go1.24.3.linux-amd64.tar.gz
clear
tar -C /usr/local -xzf go1.24.3.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc
go version
clear
mkdir ~/hello-go && cd ~/hello-go
go mod init hello-go
nano main.go
clear
go build
./hello-go
clear
go install
echo 'export PATH=$PATH:$HOME/go/bin' >> ~/.bashrc
source ~/.bashrc
hello-go
clear
apt update
apt install postgresql postgresql-contrib -y
hostname
sudo -u postgres psql
ls
cd ..
ls
psql -U skyuser -d skyhostsolutions -f backup.sql
ls
cd root
ls
psql -U skyuser -d skyhostsolutions -f backup.sql
sudo -u postgres psql skyhostsolutions < backup.sql
nano .env
npm install
apt install npm
npm install
unzip website-backup.zip 
npm install
cd /root/.npm/_logs/2026-05-21T10_42_25_792Z-debug-0.log
cat /root/.npm/_logs/2026-05-21T10_42_25_792Z-debug-0.log
npm install -g pnpm
pnpm run build
npm run build
ls
cd ..
ls
ls root/
cd root/
pnpm install
apt remove nodejs -y
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
npm install -g pnpm
pnpm install
npm run build
npm start
mkdir -p /var/www/skyhostsolutions
cd /var/www/skyhostsolutions/
ls
ls
unzip website-backup.zip
npm install
pnpm install
pnpm start
nano package.json
rm -rf node_modules
pnpm install
pnpm run
nano package.json
clear
journalctl -b -1
clear
journalctl --disk-usage
clear
journalctl --vacuum-time=7d
clear
journalctl --vacuum-size=500M
clear
journalctl > system-logs.txt
journalctl -u nginx > nginx-logs.txt
clear
journalctl
clear
journalctl -n 50
clear
journalctl -f
clear
journalctl -u apache2
journalctl -u nginx
journalctl -u nginx -f
clear
journalctl --since today
clear
journalctl --since "1 hour ago"
clear
journalctl --since "2026-05-23 10:00:00"
journalctl --since "2026-05-22 10:00:00"
clear
journalctl --since yesterday --until today
clear
journalctl -p err
clear
journalctl -p warning
clear
journalctl -k
clear
journalctl -b
clear
clear
sudo npm install -g pnpm
npm fund
pnpm -v
cd artifacts/skyhost/src/pages/
cd ..
cd ..
cd ..
ls
cd ..
ls
pnpm install
pnpm add -g pnpm
pnpm setup
pnpm add -g pnpm
pnpm install
find ~/Downloads/website-backup -name package.json
find -name package.json
cd /artifacts/skyhost/
cd artifacts/
ls
cd skyhost/
ls
clear
pnpm install
export npm_config_user_agent="pnpm"
pnpm install
cd /
export npm_config_user_agent="pnpm"
cd ~/artifacts/skyhost
pnpm install
export npm_config_user_agent="pnpm/11.1.3 node/v22 linux x64"
pnpm install
npm uninstall -g pnpm
curl -fsSL https://get.pnpm.io/install.sh | sh -
source ~/.bashrc
pnpm install
pnpm dev --host 0.0.0.0
nano ~/package.json
pnpm install
pnpm approve-builds
pnpm install
pnpm dev --host 0.0.0.0
PORT=5173 pnpm dev --host 0.0.0.0
clear
PORT=5173 pnpm dev --host 0.0.0.0
nano .env
pnpm dev --host 0.0.0.0
PORT=3000 pnpm dev --host 0.0.0.0
iptables -I INPUT -p tcp --dport 5173 -j ACCEPT
apt install iptables-persistent -y
netfilter-persistent save
PORT=5173 pnpm dev --host 0.0.0.0
nano .env
pnpm dev --host 0.0.0.0
grep -R "process.env" .
grep -R "import.meta.env" .
pnpm dev --host 0.0.0.0
clear
export PORT=5173
export BASE_PATH=/
pnpm dev --host 0.0.0.0
nano src/pages/Home.tsx
pnpm dev --host 0.0.0.0
nano src/pages/Home.tsx
clear
cat src/pages/Home.tsx
nano src/pages/Home.tsx
pnpm dev --host 0.0.0.0
pnpm dev --host 0.0.0.0
Tailwind CSS IntelliSense
pnpm dev --host 0.0.0.0
export PORT=5173
export BASE_PATH=/
pnpm dev --host 0.0.0.0
cd artifacts/
ls
cd skyhost/
ls
cd src
ls
cd pages/
ls
pnpm dev --host 0.0.0.0
pnpm dev --host 0.0.0.0
export PORT=5173
export BASE_PATH=/
pnpm dev --host 0.0.0.0
clear
cd /
ls
cd root
ls
export BASE_PATH=/
export PORT=5173
cd artifacts/
ls
cd skyhost/src/pages/
pnpm dev --host 0.0.0.0
pnpm dev --host 0.0.0.0
cd skyhost/src/pages/
cd /src/pages/
cd src/pages/
pnpm dev --host 0.0.0.0
export BASE_PATH=/ && export PORT=5173
pnpm dev --host 0.0.0.0
pnpm dev --host 0.0.0.0
pnpm dev --host 0.0.0.0
pnpm dev --host 0.0.0.0
pnpm dev --host 0.0.0.0
pnpm dev --host 0.0.0.0
clear
cd /
ls
cd root
ls
scp -r /root/ henry@192.168.1.152:"/home/henry/Downloads/New website backup/"
scp -r /root/ henry@192.168.1.152 /home/henry/Downloads/New website backup/
scp -r /root/ henry@192.168.1.152 "/home/henry/Downloads/New website backup/"
scp -r /root/ henry@192.168.1.152:"/home/henry/Downloads/New website backup/"
sudo -i -u postgres
pg_dump -Fc skyhostsolutions > /root/skyhostsolutions.backup
pg_dump -Fc skyhostsolutions > /DB.backup
cd /
sudo -i -u postgres
mkdir -p /backup/postgres
chown postgres:postgres /backup/postgres
sudo -i -u postgres
ls
cd /
ls
cd /root
ls
clear
ls
rm -f skyhostsolutions.backup website-backup.zip backup.sql
zip -r server-backup.zip .   -x "server-backup.zip"
zip -r server-backup.zip . -x "server-backup.zip"
zip -r server-backup.zip . \
tar --exclude='server-backup.tar.gz' -czf server-backup.tar.gz .
tar -tzf server-backup.tar.gz | less
clear
ls -lh server-backup.tar.gz
ls
