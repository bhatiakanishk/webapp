const express = require("express")
const app = express()
// Sequelize ORM
const { Sequelize } = require('sequelize');
// Parameters to create table in MySQL
const sequelize = new Sequelize('userDB', 'root', 'password', {
    host: 'localhost',
    dialect: 'mysql',
    port: '3306'
});

// Connection to the database
sequelize.authenticate().then(() => {
    console.log('Connection has been established successfully.');
}).catch((error) => {
    console.error('Unable to connect to the database: ', error);
});

// Create table "Users" with columns  
const Users = sequelize.define('Users', {
    accountid:{
        type:Sequelize.STRING,
        allowNull:false,
    },
    email:{ 
        type: Sequelize.STRING, 
        allowNull:false, 
        primaryKey:true
    },
    firstName:{ 
        type: Sequelize.STRING, 
        allowNull:false, 
    },
    lastName:{ 
        type: Sequelize.STRING, 
        allowNull:false, 
    },
    password:{ 
        type: Sequelize.STRING, 
        allowNull:false, 
    },
    myDate:{ 
        type: Sequelize.DATE, 
        defaultValue: Sequelize.NOW 
    },
    // Timestamp
    createdAt: Sequelize.DATE,
    updatedAt: Sequelize.DATE,
})

// Check for table creation
sequelize.sync().then(() => {
    console.log('Users table created successfully!');
}).catch((error) => {
    console.error('Unable to create table : ', error);
});

// Set port number to 8080
const port = "8080"
app.listen(port, () => console.log(`Server Started on port ${port}...`))
const bcrypt = require("bcrypt")

// Middleware to read incoming requests
app.use(express.json())

//Create User
app.post("/v1/account", async (req,res) => 
{
    const crypto = require("crypto");
    const accountId = crypto.randomBytes(16).toString("hex");
    const emailaddress = req.body.username;
    const firstname = req.body.firstname;
    const lastname = req.body.lastname;
    const hashedPassword = await bcrypt.hash(req.body.password,10);

    // Email Validation
    let regex = new RegExp('[a-z0-9]+@[a-z]+\.[a-z]{2,3}');
    let checkemail = [emailaddress];
    checkemail.forEach((address) => 
    {
        console.log(regex.test(address))
        console.log(emailaddress)
        if (regex.test(address) == false)
        {
            console.log("------> Please enter a valid email address")
            res.sendStatus(400)
        }
        else
        {
            Users.findOne({
                attributes: ['email'],
                where: {
                    email: emailaddress
                },
            })
            .then(find_user => {
                if(find_user == null) {
                    Users.create({
                        accountid: accountId,
                        email: emailaddress,
                        firstName: firstname,
                        lastName: lastname,
                        password: hashedPassword,
                    })
                    .then(user => res.json(user))
                    .catch(err => res.sendStatus(400).json({error: err.message}))
                }
                else{
                    console.log("------> User already exists")
                    res.sendStatus(400)
                }
            })    
            } 
        });
    });

// User Login
app.get("/login", async (req,res) => 
{   
    if(req.headers.authorization == null)
    {
        console.log("------> Please enter valid email and password")
        res.sendStatus(400)
    }
    else
    {
        const auth_header = req.headers.authorization;
        var auth = new Buffer.from(auth_header.split(' ')[1], 'base64').toString().split(':');
        if(auth == null)
        {
            console.log("------> Please enter valid email and password")
            res.sendStatus(400)
        }
        else
        {
            var input_emailaddress = auth[0];
            var passworduser = auth[1];
            if(input_emailaddress == null || passworduser == null)
            {
                console.log("------> Please enter valid email and password")
                res.sendStatus(400)
            }
            else
            {
                const hashedPassword = await bcrypt.hash(passworduser,10);
                Users.findOne({
                    attributes: ['password'],
                    where: {
                        email: input_emailaddress,
                    },
                })
                .then(find_user => 
                {
                    bcrypt.compare(passworduser, find_user.password, function(err, compare_results){
                        if(compare_results){
                            console.log("------> User Logged in")
                            res.sendStatus(200)
                        }
                        else{
                            console.log("------> Incorrect Password")
                            res.sendStatus(400)
                        }
                    })
                }).catch(err => res.sendStatus(400).json({error: err.message}))
            }
        }
    }
});

// Get User Info
app.get("/v1/account/:accountid", async (req,res) => 
{
    const input_id = req.params.accountid;
    
    if(req.headers.authorization == null)
    {
        console.log("------> No credentials passed")
        res.sendStatus(401).end()
    }
    else{
        const auth_header = req.headers.authorization;
        var auth = new Buffer.from(auth_header.split(' ')[1], 'base64').toString().split(':');    
        var input_emailaddress = auth[0];
        var input_password = auth[1];
        
        if(input_emailaddress == null || input_password == null)
        {
            console.log("------> Email Address or Password Not Found")
            res.sendStatus(401).end()
        }
        else
        {
            Users.findAll({
                attributes: ['email', 'accountid', 'firstName', 'lastName', 'createdAt', 'updatedAt'],
                where: {
                    accountid: input_id,
                },
            })
            .then(find_user => 
            {
                if(find_user!=""){
                    console.log(find_user)
                    Users.findOne({
                        attributes: ['email','password'],
                        where: {
                            accountid: input_id,
                        },
                    })
                    .then(find_password => 
                    {
                        bcrypt.compare(input_password, find_password.password, function(err, compare_results){
                            if(compare_results){
                                console.log("------> User Logged in")
                                if(find_password.email == input_emailaddress){
                                    res.json([find_user]).end()
                                }
        
                                else{
                                    console.log("------> Account ID Mismatch")
                                    res.sendStatus(403).end()
                                }
                            }
                            else{
                                console.log("------> Incorrect Password")
                                res.sendStatus(401).end()
                            }
                        })
                    })
                }
                else{
                    res.sendStatus(401).end()
                }
            })
        }
    }
});

// Update User Info
app.put("/v1/account/:accountid", async (req,res) => 
{
    const input_id = req.params.accountid;
    const new_hash = await bcrypt.hash(req.body.password,10);
    const new_first_name = req.body.firstname;
    const new_last_name = req.body.lastname;
    
    if(req.headers.authorization == null)
    {
        console.log("------> No credentials passed")
        res.sendStatus(401).end()
    }
    else{
        const auth_header = req.headers.authorization;
        var auth = new Buffer.from(auth_header.split(' ')[1], 'base64').toString().split(':');    
        var input_emailaddress = auth[0];
        var input_password = auth[1];
        
        if(input_emailaddress == null || input_password == null)
        {
            console.log("------> Email Address or Password Not Found")
            res.sendStatus(401).end()
        }
        else
        {
            Users.findAll({
                attributes: ['email', 'accountid', 'firstName', 'lastName', 'createdAt', 'updatedAt'],
                where: {
                    accountid: input_id,
                },
            })
            .then(find_user => 
            {
                if(find_user!=""){
                    Users.findOne({
                        attributes: ['email','password'],
                        where: {
                            accountid: input_id,
                        },
                    })
                    .then(find_password => 
                    {
                        bcrypt.compare(input_password, find_password.password, function(err, compare_results){
                            if(compare_results){
                                console.log("------> User Logged in")
                                if(find_password.email == input_emailaddress){
                                    Users.update({
                                        firstName: new_first_name,
                                        lastName: new_last_name,
                                        password: new_hash,
                                    },
                                        {
                                            where:{accountid: input_id}
                                        }
                                    )
                                    .then(r3 => {
                                        console.log("Account details of user updated successfully")
                                        res.status(204).end()
                                    })
                                }
                                else{
                                    console.log("------> Account ID Mismatch")
                                    res.sendStatus(403).end()
                                }
                            }
                            else{
                                console.log("------> Incorrect Password")
                                res.sendStatus(401).end()
                            }
                        })
                    })
                }
                else{
                    res.sendStatus(401).end()
                }
            })
        }
    }
});