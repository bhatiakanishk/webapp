# CSYE 6225

Assignments for CSYE 6225

# Prerequisites

### Github

A fork is made from the organization called kanishkbhatia/ webapp. The repository on the fork is then cloned locally using the 'git clone' command and using SSH.

### Node

Install node and npm by running the following commands:

```
sudo apt install nodejs

sudo apt install npm
```

### MySQL Workbench

Run a MySQL connection on:
```
host: localhost

port: 3306

username: root

password: password
```

Create two schemas after that:
```
userDB

productDB
```

### Packer

Install packer
```
curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo apt-key add -

sudo apt-add-repository "deb [arch=amd64] https://apt.releases.hashicorp.com $(lsb_release -cs) main"

sudo apt-get update && sudo apt-get install packer
```

## Running the code with node

In the git directory, run the following command to install the dependencies and run the code:
```
npm start
```

## Variable file

Create a variable.tfvars file and the following code to it:

```
aws_region = "us-east-1"
source_ami = "ami-0123456789"
ssh_username = "ec2-user"
subnet_id = "subnet-0123456789"
ami_user = "123456789012"
vpc_id = "vpc-0123456789"
```

## Building the AMI with Packer

Build the AMI by running the following code:
```
packer init .

packer fmt .

packer validate .

packer build webapp-ami.pkr.hcl
```

## Postman

Postman needs to be installed for testing the API calls
```
http://127.0.0.1:8080/{requiredRequest}
```

Depending on the type of API call, change the HTTP requests

Sample to add new user:
```
{
    "username": "login@gmail.com",
    "first_name": "Kanishk",
    "last_name": "Bhatia",
    "password": "12345"
}

Sample to add new product:

{
    "name": "Galaxy S22+",
    "description": "Smartphone",
    "sku": "1",
    "manufacturer": "Samsung",
    "quantity": 50
}
```

## Running the test

npm run test
