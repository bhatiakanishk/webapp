#!/bin/bash

# Update the package manager and upgrade installed packages
sudo yum update -y
sudo yum upgrade -y

# Install Node.js
curl -sL https://rpm.nodesource.com/setup_14.x | sudo bash -
sudo yum install -y nodejs

# MariaDB Server
sudo yum -y install mariadb-server
sudo systemctl start mariadb
sudo systemctl enable mariadb

# Create database schema
sudo mysql -u root
sudo mysql <<MYSQL_SCRIPT
CREATE DATABASE userDB;
CREATE DATABASE productDB;
drop user root@localhost;
FLUSH PRIVILEGES;
CREATE USER 'root'@'localhost' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON userDB.* TO 'root'@'localhost';
GRANT ALL PRIVILEGES ON productDB.* TO 'root'@'localhost';
MYSQL_SCRIPT

# Install packages
cd /home/ec2-user/ && npm install
wait
# PM2
sudo npm install -g pm2
sudo pm2 start index.js --name csye6225 --log ./csye6225.log
sudo pm2 startup systemd
sudo pm2 save
sudo pm2 list