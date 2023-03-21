#!/bin/bash

# Update the package manager and upgrade installed packages
sudo yum update -y
sudo yum upgrade -y

# Install Node.js
curl -sL https://rpm.nodesource.com/setup_14.x | sudo bash -
sudo yum install -y nodejs

# Install dotenv
sudo npm install -g dotenv

# Create directory
mkdir -p /home/ec2-user/webapp
sudo chmod -R 755 /home/ec2-user/webapp

# Move files to webapp
sudo mv /home/ec2-user/index.js /home/ec2-user/webapp/
sudo mv /home/ec2-user/package.json /home/ec2-user/webapp/
sudo mv /home/ec2-user/server.d.ts /home/ec2-user/webapp/
sudo mv /home/ec2-user/server.service /home/ec2-user/webapp/
sudo mv /home/ec2-user/cloudwatch-config.json /opt/


# Install CloudWatch Agent
sudo yum install -y wget
wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
sudo rpm -U ./amazon-cloudwatch-agent.rpm
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c file:/opt/cloudwatch-config.json -s

# Create .env
touch /home/ec2-user/webapp/.env
sudo chmod 775 /home/ec2-user/webapp/.env

# Install packages
cd /home/ec2-user/webapp/ && npm install
wait