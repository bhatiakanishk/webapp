# CSYE 6225fghjk
Assignments for CSYE 6225

## Prerequisites

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

## Running the code
In the git directory, run the following command to install the dependencies and run the code:
```
npm start
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
    "firstname": "Kanishk",
    "lastname": "Bhatia",
    "password": "12345"
}

Sample to add new product:

{
    "productname": "Galaxy S22",
    "productdescription": "Smartphone",
    "productsku": "1",
    "productmanufacturer": "Samsung",
    "productquantity": 50
}
```

## Running the test
npm run test
