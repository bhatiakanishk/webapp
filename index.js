const express = require("express");
const app = express();
const crypto = require("crypto");
module.exports = app;

// Sequelize ORM
const {
    Sequelize
} = require('sequelize');

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
    id: {
        type: Sequelize.INTEGER,
        allowNull: false,
    },
    username: {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: true
    },
    first_name: {
        type: Sequelize.STRING,
        allowNull: false,
    },
    last_name: {
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
}, {
    createdAt: 'account_created',
    updatedAt: 'account_updated'
})

// Check for user table creation
sequelize.sync().then(() => {
    console.log('Users table created successfully!');
}).catch((error) => {
    console.error('Unable to create table : ', error);
});

// Set port number to 8080
const port = "12345"
app.listen(port, () => console.log(`Server Started on port ${port}...`))
const bcrypt = require("bcrypt")

// Middleware to read incoming requests
app.use(express.json())

//Create User
app.post("/v1/user", async (req, res) => {
    const id = generateRandomInt(1, 1000);;
    const username = req.body.username;
    const first_name = req.body.first_name;
    const last_name = req.body.last_name;
    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    // Email Validation
    let regex = new RegExp('[a-z0-9]+@[a-z]+\.[a-z]{2,3}');
    let checkemail = [username];
    checkemail.forEach((address) => {
        // console.log(regex.test(address))
        // console.log(emailaddress)
        if (regex.test(address) == false) {
            console.log("------> Please enter a valid email address")
            res.sendStatus(400)
        } else {
            Users.findOne({
                    attributes: ['username'],
                    where: {
                        username: username
                    },
                })
                .then(find_user => {
                    if (find_user == null) {
                        Users.create({
                                id: id,
                                username: username,
                                first_name: first_name,
                                last_name: last_name,
                                password: hashedPassword,
                            })
                            .then(user => res.status(201).send({
                                message: 'User Created',
                                id: user.id,
                                username: user.username,
                                first_name: user.first_name,
                                last_name: user.last_name,
                                account_created: user.account_created,
                                account_updated: user.account_updated
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
                            username: input_emailaddress,
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
app.get("/v1/user/:userid", async (req, res) => {
    const input_id = req.params.userid;

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
                    attributes: ['username', 'id', 'first_name', 'last_name', 'account_created', 'account_updated'],
                    where: {
                        id: input_id,
                    },
                })
                .then(find_user => {
                    if (find_user != "") {
                        console.log(find_user)
                        Users.findOne({
                                attributes: ['username', 'password'],
                                where: {
                                    id: input_id,
                                },
                            })
                            .then(find_password => {
                                bcrypt.compare(input_password, find_password.password, function (err, compare_results) {
                                    if (compare_results) {
                                        console.log("------> User Logged in")
                                        if (find_password.username == input_emailaddress) {
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
app.put("/v1/user/:userid", async (req, res) => {
    const input_id = req.params.userid;
    const new_hash = await bcrypt.hash(req.body.password, 10);
    const new_first_name = req.body.first_name;
    const new_last_name = req.body.last_name;

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
                    attributes: ['username', 'id', 'first_name', 'last_name', 'account_created', 'account_updated'],
                    where: {
                        id: input_id,
                    },
                })
                .then(find_user => {
                    if (find_user != "") {
                        Users.findOne({
                                attributes: ['username', 'password'],
                                where: {
                                    id: input_id,
                                },
                            })
                            .then(find_password => {
                                bcrypt.compare(input_password, find_password.password, function (err, compare_results) {
                                    if (compare_results) {
                                        console.log("------> User Logged in")
                                        if (find_password.username == input_emailaddress) {
                                            Users.update({
                                                    first_name: new_first_name,
                                                    last_name: new_last_name,
                                                    password: new_hash,
                                                }, {
                                                    where: {
                                                        id: input_id
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
    id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
    },
    name: {
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
        unique: true,
    },
    manufacturer: {
        type: Sequelize.STRING,
        allowNull: false,
    },
    quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
    },
    owner_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
    },
    myDate: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
    },
}, {
    createdAt: 'date_added',
    updatedAt: 'date_last_updated'
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
            attributes: ["id", "password"],
            where: {
                username: inputEmailAddress,
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
        console.log("------> User Logged in");

        const id = generateRandomInt(1, 1000);
        const name = req.body.name;
        const description = req.body.description;
        const sku = req.body.sku;
        const manufacturer = req.body.manufacturer;
        const quantity = req.body.quantity;
        const owner_user_id = user.id;

        if (!name || !description || !sku || !manufacturer || !quantity) {
            console.log("------> Missing required fields");
            return res.status(400).send({
                error: "Please enter all the required fields"
            });
        }

        if (typeof name !== "string" || typeof description !== "string" || typeof sku !== "string" || typeof manufacturer !== "string" || typeof quantity !== "number" || typeof owner_user_id !== "number") {
            console.log("------> Invalid input data types");
            return res.status(400).send({
                error: "Invalid input data types"
            });
        }

        if (!Number.isInteger(quantity) || quantity <= 0 || quantity >= 100) {
            console.log("------> Product quantity invalid");
            return res.status(400).send({
                error: "Invalid product quantity"
            });
        }

        const existingProduct = await Products.findOne({
            attributes: ["sku"],
            where: {
                sku: sku,
            },
        });

        if (existingProduct) {
            console.log("------> Product SKU already exists");
            return res.status(400).send({
                error: "Product SKU already exists"
            });
        }

        const product = await Products.create({
            id: id,
            name: name,
            description: description,
            sku: sku,
            manufacturer: manufacturer,
            quantity: quantity,
            owner_user_id: owner_user_id,
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
app.delete("/v1/product/:productId", async (req, res) => {
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
            attributes: ["id", "password"],
            where: {
                username: inputEmailAddress,
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
        const id = req.params.productId;
        const product = await Products.findByPk(id);

        if (!product) {
            console.log("------> Product not found");
            return res.status(404).send({
                error: "Product not found"
            });
        }
        if (user.id != product.owner_user_id) {
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
app.put("/v1/product/:productId", async (req, res) => {
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
            attributes: ["id", "password"],
            where: {
                username: inputEmailAddress,
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
        console.log("------> User Logged in");
        const productId = req.params.productId;
        const name = req.body.name;
        const description = req.body.description;
        const sku = req.body.sku;
        const manufacturer = req.body.manufacturer;
        const quantity = req.body.quantity;
        const owner_user_id = user.id;

        if (!name || !description || !sku || !manufacturer || name.length === 0 || description.length === 0 || sku.length === 0 || manufacturer.length === 0) {
            console.log("------> Missing required field");
            return res.status(400).send({
                error: "Missing required field"
            });
        }

        if (typeof name !== "string" || typeof description !== "string" || typeof sku !== "string" || typeof manufacturer !== "string" || typeof quantity !== "number" || typeof owner_user_id !== "number") {
            console.log("------> Invalid input data types");
            return res.status(400).send({
                error: "Invalid input data types"
            });
        }

        if (!Number.isInteger(quantity) || quantity <= 0 || quantity >= 100) {
            console.log("------> Product quantity invalid");
            return res.status(400).send({
                error: "Invalid product quantity"
            });
        }

        const product = await Products.findOne({
            where: {
                id: productId,
                owner_user_id: owner_user_id
            }
        });

        if (!product) {
            console.log("------> Unauthorized to update this product");
            return res.status(403).send({
                error: "Unauthorized to update this product"
            });
        }

        if (sku && sku !== product.sku) {
            try {
                const existingProduct = await Products.findOne({ where: { sku } });
                if (existingProduct) {
                    console.log("------> SKU already exists in the database");
                    return res.status(400).send({
                        error: "SKU already exists in the database"
                    });
                }
            } catch (error) {
                console.error(error);
                return res.status(400).send({
                    error: error.message
                });
            }
        }

        const updatedProduct = await product.update({
            name: name,
            description: description,
            sku: sku,
            manufacturer: manufacturer,
            quantity: quantity,
        });
        return res.json(updatedProduct);
    } catch (error) {
        console.error(error);
        return res.status(400).send({
            error: error.message
        });
    }
})

app.patch("/v1/product/:productId", async (req, res) => {
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
            attributes: ["id", "password"],
            where: {
                username: inputEmailAddress,
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
        const productId = req.params.productId;

        const product = await Products.findOne({
            where: {
                id: productId,
                owner_user_id: user.id
            }
        });

        if (!product) {
            console.log("------> Unauthorized to update this product");
            return res.status(401).send({
                error: "Unauthorized to update this product"
            });
        }

        const name = req.body.name || product.name;
        const description = req.body.description || product.description;
        const sku = req.body.sku || product.sku;
        const manufacturer = req.body.manufacturer || product.manufacturer;
        const quantity = req.body.quantity || product.quantity;

        if (quantity !== undefined && (!Number.isInteger(quantity) || quantity < 0)) {
            console.log("------> Product quantity invalid");
            return res.status(400).send({
                error: "Invalid product quantity"
            });
        }

        if (sku && sku !== product.sku) {
            try {
                const existingProduct = await Products.findOne({ where: { sku } });
                if (existingProduct) {
                    console.log("------> SKU already exists in the database");
                    return res.status(400).send({
                        error: "SKU already exists in the database"
                    });
                }
            } catch (error) {
                console.error(error);
                return res.status(400).send({
                    error: error.message
                });
            }
        }

        const updatedProduct = await product.update({
            name: name,
            description: description,
            sku: sku,
            manufacturer: manufacturer,
            quantity: quantity,
        });
        return res.json(updatedProduct);
    } catch (error) {
        console.error(error);
        return res.status(400).send({
            error: error.message
        });
    }
});

// Get product by ID
app.get("/v1/product/:productId", async (req, res) => {
    try {
        const productId = req.params.productId;
        const product = await Products.findOne({
            attributes: ["id", "name", "description", "sku", "manufacturer", "quantity", "date_added", "date_last_updated", "owner_user_id"],
            where: {
                id: productId,
            }
        });

        if (!product) {
            console.log("------> Product not found");
            return res.status(404).send({
                error: "Product not found"
            });
        }
        return res.status(200).json({
            id: product.id,
            name: product.name,
            description: product.description,
            sku: product.sku,
            manufacturer: product.manufacturer,
            quantity: product.quantity,
            date_added: product.date_added,
            date_last_updated: product.date_last_updated,
            owner_user_id: product.owner_user_id
        });
    } catch (error) {
        console.error(error);
        return res.status(400).send({
            error: error.message
        });
    }
});