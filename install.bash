#!/bin/bash

# Update the package manager and upgrade installed packages
sudo yum update -y
sudo yum upgrade -y

# Install Node.js
curl -sL https://rpm.nodesource.com/setup_14.x | sudo bash -
sudo yum install -y nodejs

# Install global NPM packages
sudo npm install -g npm
sudo npm install -g express
sudo npm install -g express body-parser --save
sudo npm install -g bcryptjs
sudo npm install -g crypto
sudo npm install -g pm2

sudo cp /home/ec2-user/server.service /etc/systemd/system

sudo npm install -g mysql2
sudo npm install -g sequelize

# MariaDB Server
sudo yum -y install mariadb-server