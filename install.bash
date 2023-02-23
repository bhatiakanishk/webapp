#!/bin/bash

# Update the package manager and upgrade installed packages
sudo yum update -y
sudo yum upgrade -y

# Install Node.js
curl -sL https://rpm.nodesource.com/setup_16.x | sudo bash -
sudo yum install -y nodejs

# Install global NPM packages
sudo npm install -g npm@9.5.0
sudo npm install -g express
sudo npm install -g sequelize
sudo npm install -g bcrypt
sudo npm install -g crypto
sudo npm install -g mysql
sudo npm install -g mysql2
