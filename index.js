const express = require("express");
const app = express();
const crypto = require("crypto");
module.exports = app;

// Sequelize ORM
const { Sequelize } = require('sequelize');

function generateRandomInt(min, max) {
    const randomBytes = crypto.randomBytes(4);
    const randomInt = randomBytes.readUInt32BE();
    const adjustedInt = (randomInt % (max - min + 1)) + min;
    return adjustedInt;
}

// Parameters to create user table
const sequelize = new Sequelize('userDB', 'root', 'password', {
    host: 'localhost',
    dialect: 'mysql',
    port: '3306'
});

// Connection of user table to the database
sequelize.authenticate().then(() => {
    console.log('User table connected successfully');
}).catch((error) => {
    console.error('Unable to connect to the database: ', error);
});

// Healthz
app.get('/healthz', (req, res) => {
    res.status(200).json('OK')
})

// Create table "Users" with columns  
const Users = sequelize.define('Users', {
    accountid: {
        type: Sequelize.INTEGER,
        allowNull: false,
    },
    email: {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: true
    },
    firstName: {
        type: Sequelize.STRING,
        allowNull: false,
    },
    lastName: {
        type: Sequelize.STRING,
        allowNull: false,
    },
    password: {
        type: Sequelize.STRING,
        allowNull: false,
    },
    myDate: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
    },
    // Timestamp
    createdAt: Sequelize.DATE,
    updatedAt: Sequelize.DATE,
})

// Check for user table creation
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
app.post("/v1/user", async (req, res) => {
    const accountId = generateRandomInt(1, 1000);;
    const emailaddress = req.body.username;
    const firstname = req.body.firstname;
    const lastname = req.body.lastname;
    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    // Email Validation
    let regex = new RegExp('[a-z0-9]+@[a-z]+\.[a-z]{2,3}');
    let checkemail = [emailaddress];
    checkemail.forEach((address) => {
        console.log(regex.test(address))
        console.log(emailaddress)
        if (regex.test(address) == false) {
            console.log("------> Please enter a valid email address")
            res.sendStatus(400)
        } else {
            Users.findOne({
                    attributes: ['email'],
                    where: {
                        email: emailaddress
                    },
                })
                .then(find_user => {
                    if (find_user == null) {
                        Users.create({
                                accountid: accountId,
                                email: emailaddress,
                                firstName: firstname,
                                lastName: lastname,
                                password: hashedPassword,
                            })
                            .then(user => res.status(201).send({
                                message: 'User Created',
                                accountid: user.accountid,
                                email: user.email,
                                firstName: user.firstName,
                                lastName: user.lastName
                            }))                              
                            .catch(err => res.sendStatus(400).json({
                                error: err.message
                            }))
                    } else {
                        console.log("------> User already exists")
                        res.sendStatus(400)
                    }
                })
        }
    });
});

// User Login
app.get("/login", async (req, res) => {
    if (req.headers.authorization == null) {
        console.log("------> Please enter valid email and password")
        res.sendStatus(400)
    } else {
        const auth_header = req.headers.authorization;
        var auth = new Buffer.from(auth_header.split(' ')[1], 'base64').toString().split(':');
        if (auth == null) {
            console.log("------> Please enter valid email and password")
            res.sendStatus(400)
        } else {
            var input_emailaddress = auth[0];
            var passworduser = auth[1];
            if (input_emailaddress == null || passworduser == null) {
                console.log("------> Please enter valid email and password")
                res.sendStatus(400)
            } else {
                const hashedPassword = await bcrypt.hash(passworduser, 10);
                Users.findOne({
                        attributes: ['password'],
                        where: {
                            email: input_emailaddress,
                        },
                    })
                    .then(find_user => {
                        bcrypt.compare(passworduser, find_user.password, function (err, compare_results) {
                            if (compare_results) {
                                console.log("------> User Logged in")
                                res.sendStatus(200)
                            } else {
                                console.log("------> Incorrect Password")
                                res.sendStatus(400)
                            }
                        })
                    }).catch(err => res.sendStatus(400).json({
                        error: err.message
                    }))
            }
        }
    }
});

// Get User Info
app.get("/v1/user/:accountid", async (req, res) => {
    const input_id = req.params.accountid;

    if (req.headers.authorization == null) {
        console.log("------> No credentials passed")
        res.sendStatus(401).end()
    } else {
        const auth_header = req.headers.authorization;
        var auth = new Buffer.from(auth_header.split(' ')[1], 'base64').toString().split(':');
        var input_emailaddress = auth[0];
        var input_password = auth[1];

        if (input_emailaddress == null || input_password == null) {
            console.log("------> Email Address or Password Not Found")
            res.sendStatus(401).end()
        } else {
            Users.findAll({
                    attributes: ['email', 'accountid', 'firstName', 'lastName', 'createdAt', 'updatedAt'],
                    where: {
                        accountid: input_id,
                    },
                })
                .then(find_user => {
                    if (find_user != "") {
                        console.log(find_user)
                        Users.findOne({
                                attributes: ['email', 'password'],
                                where: {
                                    accountid: input_id,
                                },
                            })
                            .then(find_password => {
                                bcrypt.compare(input_password, find_password.password, function (err, compare_results) {
                                    if (compare_results) {
                                        console.log("------> User Logged in")
                                        if (find_password.email == input_emailaddress) {
                                            res.json([find_user]).end()
                                        } else {
                                            console.log("------> Account ID Mismatch")
                                            res.sendStatus(403).end()
                                        }
                                    } else {
                                        console.log("------> Incorrect Password")
                                        res.sendStatus(401).end()
                                    }
                                })
                            })
                    } else {
                        res.sendStatus(401).end()
                    }
                })
        }
    }
});

// Update User Info
app.put("/v1/user/:accountid", async (req, res) => {
    const input_id = req.params.accountid;
    const new_hash = await bcrypt.hash(req.body.password, 10);
    const new_first_name = req.body.firstname;
    const new_last_name = req.body.lastname;

    if (req.headers.authorization == null) {
        console.log("------> No credentials passed")
        res.sendStatus(401).end()
    } else {
        const auth_header = req.headers.authorization;
        var auth = new Buffer.from(auth_header.split(' ')[1], 'base64').toString().split(':');
        var input_emailaddress = auth[0];
        var input_password = auth[1];

        if (input_emailaddress == null || input_password == null) {
            console.log("------> Email Address or Password Not Found")
            res.sendStatus(401).end()
        } else {
            Users.findAll({
                    attributes: ['email', 'accountid', 'firstName', 'lastName', 'createdAt', 'updatedAt'],
                    where: {
                        accountid: input_id,
                    },
                })
                .then(find_user => {
                    if (find_user != "") {
                        Users.findOne({
                                attributes: ['email', 'password'],
                                where: {
                                    accountid: input_id,
                                },
                            })
                            .then(find_password => {
                                bcrypt.compare(input_password, find_password.password, function (err, compare_results) {
                                    if (compare_results) {
                                        console.log("------> User Logged in")
                                        if (find_password.email == input_emailaddress) {
                                            Users.update({
                                                    firstName: new_first_name,
                                                    lastName: new_last_name,
                                                    password: new_hash,
                                                }, {
                                                    where: {
                                                        accountid: input_id
                                                    }
                                                })
                                                .then(r3 => {
                                                    console.log("Account details of user updated successfully")
                                                    res.status(204).end()
                                                })
                                        } else {
                                            console.log("------> Account ID Mismatch")
                                            res.sendStatus(403).end()
                                        }
                                    } else {
                                        console.log("------> Incorrect Password")
                                        res.sendStatus(401).end()
                                    }
                                })
                            })
                    } else {
                        res.sendStatus(401).end()
                    }
                })
        }
    }
});


// Parameters to create product table
const sequelizeProduct = new Sequelize('productDB', 'root', 'password', {
    host: 'localhost',
    dialect: 'mysql',
    port: '3306'
});

// Connection of product table to the database
sequelizeProduct.authenticate().then(() => {
    console.log('Product table connected successfully');
}).catch((error) => {
    console.error('Unable to connect to the database: ', error);
});

// Create table "Products" with columns  
const Products = sequelizeProduct.define('Products', {
    productid: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
    },
    productName: {
        type: Sequelize.STRING,
        allowNull: false,
    },
    description: {
        type: Sequelize.STRING,
        allowNull: false,
    },
    sku: {
        type: Sequelize.STRING,
        allowNull: false,
    },
    manufacturer: {
        type: Sequelize.STRING,
        allowNull: false,
    },
    quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
    },
    accountid: {
        type: Sequelize.INTEGER,
        allowNull: false,
    },
    myDate: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
    },
    // Timestamp
    createdAt: Sequelize.DATE,
    updatedAt: Sequelize.DATE,
})

// Check for product table creation
sequelizeProduct.sync().then(() => {
    console.log('Products table created successfully!');
}).catch((error) => {
    console.error('Unable to create table : ', error);
});

// Create product
app.post("/v1/product", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            console.log("------> Please enter a valid email and password");
            return res.status(401).send({
                error: "Please enter a valid email and password"
            });
        }

        const auth = new Buffer.from(authHeader.split(" ")[1], "base64").toString().split(":");
        const inputEmailAddress = auth[0];
        const password = auth[1];
        if (!inputEmailAddress || !password) {
            console.log("------> Please enter a valid email and password");
            return res.status(400).send({
                error: "Please enter a valid email and password"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await Users.findOne({
            attributes: ["accountid", "password"],
            where: {
                email: inputEmailAddress,
            },
        });

        if (!user) {
            console.log("------> User not found");
            return res.status(404).send({
                error: "User not found"
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            console.log("------> Incorrect Password");
            return res.status(401).send({
                error: "Incorrect Password"
            });
        }

        const userId = user.accountid;
        console.log(userId);
        console.log("------> User Logged in");
        
        const productId = generateRandomInt(1, 1000);
        const productName = req.body.productname;
        const productDescription = req.body.productdescription;
        const productSku = req.body.productsku;
        const productManufacturer = req.body.productmanufacturer;
        const productQuantity = req.body.productquantity;
        const ownerId = userId;

        if (!Number.isInteger(productQuantity) || productQuantity <= 0 || productQuantity >= 100) {
            console.log("------> Product quantity invalid");
            return res.status(400).send({
                error: "Invalid product quantity"
            });
        }

        const existingProduct = await Products.findOne({
            attributes: ["sku"],
            where: {
                sku: productSku,
            },
        });

        if (existingProduct) {
            console.log("------> Product SKU already exists");
            return res.status(400).send({
                error: "Product SKU already exists"
            });
        }

        const product = await Products.create({
            productid: productId,
            productName: productName,
            description: productDescription,
            sku: productSku,
            manufacturer: productManufacturer,
            quantity: productQuantity,
            accountid: ownerId,
        });
        return res.status(201).send({
            message: "Product Created",
            product: product
        });        
    } catch (error) {
        console.error(error);
        return res.status(400).send({
            error: error.message
        });
    }
});

// Delete product
app.delete("/v1/product/:productid", async(req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            console.log("------> Please enter a valid email and password");
            return res.status(401).send({
                error: "Please enter a valid email and password"
            });
        }

        const auth = new Buffer.from(authHeader.split(" ")[1], "base64").toString().split(":");
        const inputEmailAddress = auth[0];
        const password = auth[1];
        if (!inputEmailAddress || !password) {
            console.log("------> Please enter a valid email and password");
            return res.status(400).send({
                error: "Please enter a valid email and password"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await Users.findOne({
            attributes: ["accountid", "password"],
            where: {
                email: inputEmailAddress,
            },
        });

        if (!user) {
            console.log("------> User not found");
            return res.status(404).send({
                error: "User not found"
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            console.log("------> Incorrect Password");
            return res.status(401).send({
                error: "Incorrect Password"
            });
        }
        const productId = req.params.productid;
        const product = await Products.findByPk(productId);

        if(!product) {
            console.log("------> Product not found");
            return res.status(404).send({
                error: "Product not found"
            });
        }

        const userId = user.accountid;
        const ownerId = product.accountid;
        //console.log(ownerId)
        if(userId != ownerId) {
            console.log("------> Not authorized to delete this product");
        return res.status(403).send({
            error: "Not authorized to delete this product"
        });
    }
        await product.destroy();
        return res.status(200).send({
            message: "Product deleted successfully"
        });
    } catch (error) {
        console.error(error);
        return res.status(400).send({
            error: error.message
        });
    }
});

// Update product with PUT
app.put("/v1/product/:productid", async(req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            console.log("------> Please enter a valid email and password");
            return res.status(401).send({
                error: "Please enter a valid email and password"
            });
        }

        const auth = new Buffer.from(authHeader.split(" ")[1], "base64").toString().split(":");
        const inputEmailAddress = auth[0];
        const password = auth[1];
        if (!inputEmailAddress || !password) {
            console.log("------> Please enter a valid email and password");
            return res.status(400).send({
                error: "Please enter a valid email and password"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await Users.findOne({
            attributes: ["accountid", "password"],
            where: {
                email: inputEmailAddress,
            },
        });

        if (!user) {
            console.log("------> User not found");
            return res.status(404).send({
                error: "User not found"
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            console.log("------> Incorrect Password");
            return res.status(401).send({
                error: "Incorrect Password"
            });
        }

        const userId = user.accountid;
        console.log(userId);
        console.log("------> User Logged in");

        const productId = req.params.productid;
        const productName = req.body.productname;
        const productDescription = req.body.productdescription;
        const productSku = req.body.productsku;
        const productManufacturer = req.body.productmanufacturer;
        const productQuantity = req.body.productquantity;
        const ownerId = userId;

        if (!productName || !productDescription || !productSku || !productManufacturer || productName.length === 0 || productDescription.length === 0 || productSku.length === 0 || productManufacturer.length === 0) {
            console.log("------> Missing required field");
            return res.status(400).send({
                error: "Missing required field"
            });
        }

        if (!Number.isInteger(productQuantity) || productQuantity < 0) {
            console.log("------> Product quantity invalid");
            return res.status(400).send({
                error: "Invalid product quantity"
            });
        }

        const product = await Products.findOne({
            where: {
                productid: productId,
                accountid: ownerId
            }
        });

        if (!product) {
            console.log("------> Unauthorized to update this product");
            return res.status(403).send({
                error: "Unauthorized to update this product"
            });
        }

        const existingProduct = await Products.findOne({
            where: {
                sku: productSku,
                accountid: ownerId
            }
        });

        if (existingProduct && existingProduct.productid !== productId) {
            console.log("------> Product SKU already exists");
            return res.status(403).send({
                error: "Product SKU already exists"
            });
        }

        const updatedProduct = await product.update({
            productName: productName,
            description: productDescription,
            sku: productSku,
            manufacturer: productManufacturer,
            quantity: productQuantity,
        });

        return res.json(updatedProduct);
    } catch (error) {
        console.error(error);
        return res.status(400).send({
            error: error.message
        });
    }
})

// Update product with PATCH
app.patch("/v1/product/:productid", async(req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            console.log("------> Please enter a valid email and password");
            return res.status(401).send({
                error: "Please enter a valid email and password"
            });
        }

        const auth = new Buffer.from(authHeader.split(" ")[1], "base64").toString().split(":");
        const inputEmailAddress = auth[0];
        const password = auth[1];
        if (!inputEmailAddress || !password) {
            console.log("------> Please enter a valid email and password");
            return res.status(400).send({
                error: "Please enter a valid email and password"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await Users.findOne({
            attributes: ["accountid", "password"],
            where: {
                email: inputEmailAddress,
            },
        });

        if (!user) {
            console.log("------> User not found");
            return res.status(404).send({
                error: "User not found"
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            console.log("------> Incorrect Password");
            return res.status(401).send({
                error: "Incorrect Password"
            });
        }

        const userId = user.accountid;
        console.log(userId);
        console.log("------> User Logged in");

        const productId = req.params.productid;
        const {
            productname,
            productdescription,
            productsku,
            productmanufacturer,
            productquantity
        } = req.body;
        const ownerId = userId;

        if (productquantity !== undefined && (!Number.isInteger(productquantity) || productquantity < 0)) {
            console.log("------> Product quantity invalid");
            return res.status(400).send({
                error: "Invalid product quantity"
            });
        }

        const product = await Products.findOne({
            where: {
                productid: productId,
                accountid: ownerId
            }
        });

        if (!product) {
            console.log("------> Unauthorized to update this product");
            return res.status(401).send({
                error: "Unauthorized to update this product"
            });
        }

        if(productsku !== undefined) {
            const existingProduct = await Products.findOne({
                where: {
                    sku: productsku,
                    accountid: accountId
                }
            });

            if (existingProduct && existingProduct.productid !== productId) {
                console.log("------> Product SKU already exists");
                return res.status(403).send({
                    error: "Product SKU already exists"
                });
            }
        }

        const updatedProduct = await product.update({
            productName: productname || product.productName,
            description: productdescription || product.productDescription,
            sku: productsku || product.productSku,
            manufacturer: productmanufacturer || product.productManufacturer,
            quantity: productquantity || product.productQuantity,
        });
        return res.json(updatedProduct);
    } catch (error) {
        console.error(error);
        return res.status(400).send({
            error: error.message
        });
    }
})

// Get product by ID
app.get("/v1/product/:productId", async (req, res) => {
    try {
        const productId = req.params.productId;
        const product = await Products.findOne({
            attributes: ["productid", "productName", "description", "sku", "manufacturer", "quantity", "accountid"],
            where: {
                productid: productId,
            }
        });

        if (!product) {
            console.log("------> Product not found");
            return res.status(404).send({
                error: "Product not found"
            });
        }
        return res.status(200).json(product);
    } catch (error) {
        console.error(error);
        return res.status(400).send({
            error: error.message
        });
    }
});