#!/bin/bash

# Mobicycle - Linux Performance Tuning Script
# Target: Ubuntu 24.04 LTS

set -e

echo "🚀 Starting Linux Performance Tuning..."

# 1. Sysctl Updates
echo "📝 Updating /etc/sysctl.conf..."
cat <<EOT >> /etc/sysctl.conf

# Mobicycle Custom Tuning
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 8192
net.ipv4.tcp_fin_timeout = 15
net.ipv4.tcp_tw_reuse = 1
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_fastopen = 3
fs.file-max = 2097152
fs.inotify.max_user_watches = 524288
vm.swappiness = 10
vm.vfs_cache_pressure = 50
EOT

sysctl -p

# 2. Limits Updates
echo "📝 Updating /etc/security/limits.conf..."
cat <<EOT >> /etc/security/limits.conf
* soft nofile 65535
* hard nofile 65535
root soft nofile 65535
root hard nofile 65535
EOT

# 3. Swap Creation (Optional but recommended for 4GB RAM)
if [ ! -f /swapfile ]; then
    echo "💾 Creating 2GB Swap file..."
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "✅ Swap created and enabled."
else
    echo "ℹ️ Swap file already exists."
fi

# 4. TCP Fast Open (Requires Kernel support)
echo "✅ TCP Fast Open enabled."

echo "✨ Tuning complete! It is recommended to REBOOT the server to ensure all limits take effect."
