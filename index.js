const express = require("express");
const app = express();
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { Sequelize } = require('sequelize');
require('dotenv').config({ path: '/home/ec2-user/webapp/.env' });
const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require("@aws-sdk/client-s3");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
const mime = require('mime');
const { defaultProvider } = require("@aws-sdk/credential-provider-node");

// StatsD for API count

let StatsD = require('node-statsd'), client =new StatsD();

// Winston Logger

const winston = require('winston');
const WinstonCloudWatch = require('winston-cloudwatch');
const { error } = require("console");

// Logger Instance

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'my-service' },
    transports: [
        new WinstonCloudWatch({
            level: 'info',
            logGroupName: 'csye6225',
            logStreamName: 'webapp',
            awsRegion: process.env.AWS_REGION,
            messageFormatter: ({level, message, ...meta}) => `${level}: ${message} ${JSON.stringify(meta)}`,
        }),
    ],
});

function generateRandomInt(min, max) {
    const randomBytes = crypto.randomBytes(4);
    const randomInt = randomBytes.readUInt32BE();
    const adjustedInt = (randomInt % (max - min + 1)) + min;
    return adjustedInt;
}

// Parameters to create user table

const sequelize = new Sequelize({
    database: process.env.DATABASENAME,
    username: process.env.SQLUSER,
    password: process.env.SQLPASSWORD,
    host: process.env.SQLHOSTNAME,
    port: '3306',
    dialect: 'mysql'
});

// Connection of user table to the database

sequelize.authenticate().then(() => {
    logger.info('User table connected successfully');
}).catch((error) => {
    logger.error('Unable to connect to the database');
});

// Healthz

app.get('/healthcheck', (req, res) => {
    client.increment('checkhealthz');
    logger.info('Health check endpoint accessed successfully');
    res.status(200).json('Okay')
})

// Create User Table columns

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
    logger.info('User table create successfully');
}).catch((error) => {
    logger.error('Unable to create user table: ', error);
});

// Middleware to read incoming requests

app.use(express.json())

//POST User

app.post("/v1/user", async (req, res) => {
    client.increment('postuserapi');
    logger.info('Reached POST User API');
    const id = generateRandomInt(1, 1000);
    const username = req.body.username;
    const first_name = req.body.first_name;
    const last_name = req.body.last_name;
    const hashedPassword = bcrypt.hashSync(data = req.body.password, salt = 10);

    logger.info(`New user registered with email: ${username}`);

    // Email Validation

    let regex = new RegExp('[a-z0-9]+@[a-z]+\.[a-z]{2,3}');
    if (regex.test(username) == false) {
        logger.error('Invalid email address');
        res.sendStatus(400).send({
            message: "Please enter a valid email address"
        });
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
                            message: "User already exists"
                        }))
                } else {
                    logger.error('User already exists');
                    res.sendStatus(400).send({
                        message: "User already exists"
                    });
                }
            })
            .catch(err => {
                logger.error('Failed to create new user: ',err);
                res.sendStatus(400).send({
                    message: "Failed to create new user"
                });
            })
    }
});

// GET User

app.get("/v1/user/:userid", async (req, res) => {
    client.increment('getuserapi');
    logger.info('Reached GET User API');
    let input_id = req.params.userid;
    try {
        input_id = parseInt(input_id)
    } catch (error) {
        logger.error('Error parsing id');
        res.sendStatus(400).send({
            message: "Error parsing id"
        });
    }
    if (req.headers.authorization == null) {
        logger.error('No credentials passed');
        res.sendStatus(401).send({
            message: "No credentials passed"
        });
    } else {
        const auth_header = req.headers.authorization;
        var auth = new Buffer.from(auth_header.split(' ')[1], 'base64').toString().split(':');
        var input_emailaddress = auth[0];
        var input_password = auth[1];
        if (input_emailaddress == null || input_password == null) {
            logger.error('Email Address or Password Not Found');
            res.sendStatus(401).send({
                message: "Email address or password not found"
            });
        } else {
            Users.findOne({
                    attributes: ['username', 'password', 'id', 'first_name', 'last_name', 'account_created', 'account_updated'],
                    where: {
                        id: input_id,
                    },
                })
                .then(find_user => {
                    if (find_user != "") {
                        user_password = find_user.password
                        bcrypt.compare(input_password, user_password, function (err, compare_results) {
                            if (compare_results) {
                                logger.info('User logged in');
                                if (find_user.username == input_emailaddress) {
                                    res.status(201).send({
                                        message: 'User Found',
                                        id: find_user.id,
                                        username: find_user.username,
                                        first_name: find_user.first_name,
                                        last_name: find_user.last_name,
                                        account_created: find_user.account_created,
                                        account_updated: find_user.account_updated
                                    })
                                } else {
                                    logger.err('Account ID mismatch');
                                    res.sendStatus(403).send({
                                        error: "Account ID mismatch"
                                    });
                                }
                            } else if (err) {
                                logger.error('Incorrect Password');
                                res.sendStatus(401).send({
                                    message: "Incorrect Password"
                                });
                            }
                        })
                    } else {
                        logger.error('User not authorized');
                        res.sendStatus(401).send({
                            message: "User not authorized"
                        });
                    }
                })
                .catch(err => {
                    logger.error('User not found');
                    res.sendStatus(400).send({
                        message: "User not found"
                    });
                })
        }
    }
});

// PUT User

app.put("/v1/user/:userid", async (req, res) => {
    client.increment('putuserapi');
    logger.info('Reached PUT User API');
    let input_id = req.params.userid;
    try {
        input_id = parseInt(input_id)
    } catch (error) {
        logger.error('Error parsing ID');
        res.sendStatus(400).send({
            message: "Error parsing ID"
        });
    }
    const new_hash = await bcrypt.hash(req.body.password, 10);
    const new_first_name = req.body.first_name;
    const new_last_name = req.body.last_name;

    if (req.headers.authorization == null) {
        logger.error('No credentials passed');
        res.sendStatus(401).send({
            message: "No credentials passed"
        });
    } else {
        const auth_header = req.headers.authorization;
        var auth = new Buffer.from(auth_header.split(' ')[1], 'base64').toString().split(':');
        var input_emailaddress = auth[0];
        var input_password = auth[1];

        if (input_emailaddress == null || input_password == null) {
            logger.error('Email Address or Password Not Found');
            res.sendStatus(401).send({
                message: "Email address or password not found"
            });
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
                                        logger.info('User Logged in');
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
                                                    logger.info('Account details updated successfully');
                                                    res.status(204).send({
                                                        message: "Account details updated successfully"
                                                    });
                                                })
                                        } else {
                                            logger.error('Account ID mismatch');
                                            res.sendStatus(403).send({
                                                message: "Account id mismatch"
                                            });
                                        }
                                    } else {
                                        logger.error('Incorrect Password')
                                        res.sendStatus(401).send({
                                            message: "Incorrect password"
                                        });
                                    }
                                })
                            })
                    } else {
                        logger.error('User not found');
                        res.sendStatus(401).send({
                            message: "User not found"
                        });
                    }
                })
        }
    }
});

// Create Product Table columns  

const Products = sequelize.define('Products', {
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

sequelize.sync().then(() => {
    logger.info('Products table created successfully!');
}).catch((error) => {
    logger.error('Unable to create table : ', error);
});

// POST Product

app.post("/v1/product", async (req, res) => {
    client.increment('postproductapi');
    logger.info('Reached POST Product API')
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            logger.error('Please enter a valid email and password');
            return res.status(401).send({
                error: "Please enter a valid email and password"
            });
        }

        const auth = new Buffer.from(authHeader.split(" ")[1], "base64").toString().split(":");
        const inputEmailAddress = auth[0];
        const password = auth[1];
        if (!inputEmailAddress || !password) {
            logger.error('Please enter a valid email and password');
            return res.status(401).send({
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
            logger.error('User not found');
            return res.status(404).send({
                error: "User not found"
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            logger.error('Incorrect Password');
            return res.status(401).send({
                error: "Incorrect Password"
            });
        }
        logger.info('User Logged in');
        const id = generateRandomInt(1, 1000);
        const name = req.body.name;
        const description = req.body.description;
        const sku = req.body.sku;
        const manufacturer = req.body.manufacturer;
        const quantity = req.body.quantity;
        const owner_user_id = user.id;

        if (!name || !description || !sku || !manufacturer || !quantity) {
            logger.error('Please enter all the required fields');
            return res.status(400).send({
                error: "Please enter all the required fields"
            });
        }

        if (typeof name !== "string" || typeof description !== "string" || typeof sku !== "string" || typeof manufacturer !== "string" || typeof quantity !== "number" || typeof owner_user_id !== "number") {
            logger.error('Invalid input data types');
            return res.status(400).send({
                error: "Invalid input data types"
            });
        }

        if (!Number.isInteger(quantity) || quantity <= 0 || quantity >= 100) {
            logger.error('Invalid product quantity');
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
            logger.error('Product SKU already exists');
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
        logger.info('Product created');
        return res.status(201).send({
            message: "Product Created",
            product: product
        });
    } catch (error) {
        logger.error('Error parsing request', error)
        return res.status(400).send({
            message: "Error parsing request",
            error: error.message
        });
    }
});

// DELETE Product

app.delete("/v1/product/:productId", async (req, res) => {
    client.increment('deleteproductapi');
    logger.info('Reached DELETE Product API')
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            logger.error('Please enter a valid email and password');
            return res.status(401).send({
                message: "Please enter a valid email and password"
            });
        }

        const auth = new Buffer.from(authHeader.split(" ")[1], "base64").toString().split(":");
        const inputEmailAddress = auth[0];
        const password = auth[1];
        if (!inputEmailAddress || !password) {
            logger.error('Please enter a valid email and password');
            return res.status(401).send({
                message: "Please enter a valid email and password"
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
            logger.error('User not found');
            return res.status(404).send({
                message: "User not found"
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            logger.error('Incorrect Password');
            return res.status(401).send({
                message: "Incorrect Password"
            });
        }
        const id = req.params.productId;
        const product = await Products.findByPk(id);

        if (!product) {
            logger.error('Product not found');
            return res.status(404).send({
                message: "Product not found"
            });
        }
        if (user.id != product.owner_user_id) {
            logger.error('Not authorized to delete this product');
            return res.status(403).send({
                message: "Not authorized to delete this product"
            });
        }

        // Delete images when product is deleted
        const images = await Image.findAll({
            where: {
                product_id: product.id
            }
        });
        for (let i = 0; i < images.length; i++) {
            const image = images[i];
            const deleteObjectCommand = new DeleteObjectCommand({
                Bucket: process.env.BUCKETNAME,
                Key: image.s3_bucket_path.substring(image.s3_bucket_path.lastIndexOf('/') + 1)
            });
            await s3.send(deleteObjectCommand);
            await image.destroy();
        }
        await product.destroy();
        logger.info('Product deleted successfully');
        return res.status(204).send({
            message: "Product deleted successfully"
        });
    } catch (error) {
        logger.error('Error parsing request');
        return res.status(400).send({
            message: 'Error parsing request',
            error: error.message
        });
    }
});

// PUT Product

app.put("/v1/product/:productId", async (req, res) => {
    client.increment('putproductapi');
    logger.info('Reached PUT Product API');
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            logger.error('Please enter a valid email and password');
            return res.status(401).send({
                message: "Please enter a valid email and password"
            });
        }

        const auth = new Buffer.from(authHeader.split(" ")[1], "base64").toString().split(":");
        const inputEmailAddress = auth[0];
        const password = auth[1];
        if (!inputEmailAddress || !password) {
            logger.error('Please enter a valid email and password');
            return res.status(401).send({
                message: "Please enter a valid email and password"
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
            logger.error('User not found');
            return res.status(404).send({
                message: "User not found"
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            logger.error('Incorrect Password');
            return res.status(401).send({
                message: "Incorrect Password"
            });
        }
        logger.info('User logged in');
        const productId = req.params.productId;
        const name = req.body.name;
        const description = req.body.description;
        const sku = req.body.sku;
        const manufacturer = req.body.manufacturer;
        const quantity = req.body.quantity;
        const owner_user_id = user.id;

        if (!name || !description || !sku || !manufacturer || name.length === 0 || description.length === 0 || sku.length === 0 || manufacturer.length === 0) {
            logger.error('Missing required field');
            return res.status(400).send({
                message: "Missing required field"
            });
        }

        if (typeof name !== "string" || typeof description !== "string" || typeof sku !== "string" || typeof manufacturer !== "string" || typeof quantity !== "number" || typeof owner_user_id !== "number") {
            logger.error('Invalid input data types');
            return res.status(400).send({
                message: "Invalid input data types"
            });
        }

        if (!Number.isInteger(quantity) || quantity <= 0 || quantity >= 100) {
            logger.error('Invalid product quantity');
            return res.status(400).send({
                message: "Invalid product quantity"
            });
        }

        const product = await Products.findOne({
            where: {
                id: productId,
                owner_user_id: owner_user_id
            }
        });

        if (!product) {
            logger.error('Unauthorized to update this product');
            return res.status(403).send({
                message: "Unauthorized to update this product"
            });
        }

        if (sku && sku !== product.sku) {
            try {
                const existingProduct = await Products.findOne({
                    where: {
                        sku
                    }
                });
                if (existingProduct) {
                    logger.error('SKU already exists in the database');
                    return res.status(400).send({
                        message: "SKU already exists in the database"
                    });
                }
            } catch (error) {
                logger.error(error);
                return res.status(400).send({
                    message: 'Error parsing request',
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
        logger.info('Product updated successfully');
        return res.json(updatedProduct);
    } catch (error) {
        logger.error(error);
        return res.status(400).send({
            message: 'Error parsing request',
            error: error.message
        });
    }
})

// PATCH Product

app.patch("/v1/product/:productId", async (req, res) => {
    client.increment('patchproductapi');
    logger.info('Reached PATCH Product API');
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            logger.error('Please enter a valid email and password');
            return res.status(401).send({
                message: "Please enter a valid email and password"
            });
        }

        const auth = new Buffer.from(authHeader.split(" ")[1], "base64").toString().split(":");
        const inputEmailAddress = auth[0];
        const password = auth[1];
        if (!inputEmailAddress || !password) {
            logger.error('Please enter a valid email and password');
            return res.status(400).send({
                message: "Please enter a valid email and password"
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
            logger.error('User not found');
            return res.status(404).send({
                message: "User not found"
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            logger.error('Incorrect Password');
            return res.status(401).send({
                message: "Incorrect Password"
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
            logger.error('Unauthorized to update this product');
            return res.status(401).send({
                message: "Unauthorized to update this product"
            });
        }
        logger.info('User logged in');
        const name = req.body.name || product.name;
        const description = req.body.description || product.description;
        const sku = req.body.sku || product.sku;
        const manufacturer = req.body.manufacturer || product.manufacturer;
        const quantity = req.body.quantity || product.quantity;

        if (quantity !== undefined && (!Number.isInteger(quantity) || quantity < 0)) {
            logger.error('Invalid product quantity');
            return res.status(400).send({
                message: "Invalid product quantity"
            });
        }

        if (sku && sku !== product.sku) {
            try {
                const existingProduct = await Products.findOne({
                    where: {
                        sku
                    }
                });
                if (existingProduct) {
                    logger.error('SKU already exists in the database');
                    return res.status(400).send({
                        error: "SKU already exists in the database"
                    });
                }
            } catch (error) {
                logger.error('Error parsing request');
                return res.status(400).send({
                    message: 'Error parsing request',
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
        logger.info('Product updated successfully');
        return res.json(updatedProduct);
    } catch (error) {
        logger.error('Error parsing request');
        return res.status(400).send({
            message: 'Error parsing request',
            error: error.message
        });
    }
});

// GET product

app.get("/v1/product/:productId", async (req, res) => {
    client.increment('getproductapi');
    logger.info('Reached GET Product API');
    try {
        const productId = req.params.productId;
        const product = await Products.findOne({
            attributes: ["id", "name", "description", "sku", "manufacturer", "quantity", "date_added", "date_last_updated", "owner_user_id"],
            where: {
                id: productId,
            }
        });

        if (!product) {
            logger.error('Product not found');
            return res.status(404).send({
                message: "Product not found"
            });
        }
        logger.info('Product found successfully');
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
        logger.error('Error parsing request');
        return res.status(400).send({
            message: 'Error parsing request',
            error: error.message
        });
    }
});

// Create Image Table columns

const Image = sequelize.define('Image', {
    image_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        unique: true
    },
    product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
    },
    file_name: {
        type: Sequelize.STRING,
        allowNull: false,
    },
    date_created: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
    },
    s3_bucket_path: {
        type: Sequelize.STRING,
        allowNull: false,
    },
});

Image.belongsTo(Products, {
    foreignKey: 'product_id'
});
Products.hasMany(Image, {
    foreignKey: 'product_id'
});

// Create Amazon S3 client instance
const s3 = new S3Client ({
    region: process.env.AWS_REGION,
    credentials: defaultProvider({ region: process.env.AWS_REGION }),
});

//multer middleware with the multer-s3 storage engine to upload files to an Amazon S3 bucket
const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.BUCKETNAME,
        key: function (req, file, cb) {
            const filename = file.originalname;
            const extension = mime.getExtension(file.mimetype);
            cb(null, `${Users.id}/${req.params.productId}/${filename}.${extension}`);
        }
    })
});

// POST Image

app.post("/v1/product/:productId/image", upload.single('image'), async (req, res) => {
    client.increment('postimageapi');
    logger.info('Reached POST Image API');
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            logger.error('Please enter a valid email and password');
            return res.status(401).send({
                message: "Please enter a valid email and password"
            });
        }

        const auth = new Buffer.from(authHeader.split(" ")[1], "base64").toString().split(":");
        const inputEmailAddress = auth[0];
        const password = auth[1];
        if (!inputEmailAddress || !password) {
            logger.error('Please enter a valid email and password');
            return res.status(401).send({
                message: "Please enter a valid email and password"
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
            logger.error('User not found');
            return res.status(404).send({
                message: "User not found"
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            logger.error('Incorrect Password');
            return res.status(401).send({
                message: "Incorrect Password"
            });
        }
        const id = req.params.productId;
        const product = await Products.findByPk(id);

        if (!product) {
            logger.error('Product not found');
            return res.status(404).send({
                message: "Product not found"
            });
        }
        if (!req.params.productId) {
            logger.error('Product ID is required');
            return res.status(400).send({
                message: "Product ID is required"
            });
        }
        if (user.id != product.owner_user_id) {
            logger.error('Not authorized to upload image for this product');
            return res.status(403).send({
                message: "Not authorized to upload image for this product"
            });
        }
        
        if (!req.file) {
            logger.error('File is required');
            return res.status(400).send({
                message: "File is required"
            });
        }

        if (!req.file.mimetype) {
            logger.error('File type is required');
            return res.status(400).send({
                message: "File type is required"
            });
        }
        const file = req.file;
        const timestamp = Date.now().toString();
        const putObjectCommand = new PutObjectCommand({
            Bucket: process.env.BUCKETNAME,
            Key: `${user.id}/${req.params.productId}/${file.originalname}-${timestamp}.${mime.getExtension(file.mimetype)}`,
            Body: file.buffer,
            ContentType: file.mimetype
        });
        await s3.send(putObjectCommand);
        const image = await Image.create({
            product_id: product.id,
            file_name: file.originalname,
            s3_bucket_path: `https://${process.env.BUCKETNAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${user.id}/${req.params.productId}/${file.originalname}-${timestamp}.${mime.getExtension(file.mimetype)}`,
            metadata: {
                contentType: file.mimetype,
                size: file.size
            }
        });

        logger.info('Image uploaded successfully');
        return res.status(201).send({
            message: "Image uploaded successfully",
            data: {
                image_id: image.image_id,
                product_id: image.product_id,
                file_name: image.file_name,
                date_created: image.date_created,
                s3_bucket_path: image.s3_bucket_path
            }
        });

    } catch (error) {
        logger.error('Error parsing request');
        return res.status(400).send({
            message: 'Error parsing request',
            error: error.message,
        });
    }
});

// DELETE Image

app.delete("/v1/product/:productId/image/:image_id", async (req, res) => {
    client.increment('deleteimageapi');
    logger.info('Reached DELETE Image API')
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            logger.error('Please enter a valid email and password');
            return res.status(401).send({
                message: "Please enter a valid email and password"
            });
        }

        const auth = new Buffer.from(authHeader.split(" ")[1], "base64").toString().split(":");
        const inputEmailAddress = auth[0];
        const password = auth[1];
        if (!inputEmailAddress || !password) {
            logger.error('Please enter a valid email and password');
            return res.status(401).send({
                message: "Please enter a valid email and password"
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
            logger.error('User not found');
            return res.status(404).send({
                message: "User not found"
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            logger.error('Incorrect Password');
            return res.status(401).send({
                message: "Incorrect Password"
            });
        }

        const productId = req.params.productId;
        const product = await Products.findByPk(productId);

        if (!product) {
            logger.error('Product not found');
            return res.status(404).send({
                message: "Product not found"
            });
        }

        if (user.id !== product.owner_user_id) {
            logger.error('Not authorized to delete image for this product');
            return res.status(403).send({
                message: "Not authorized to delete image for this product"
            });
        }

        const imageId = req.params.image_id;
        const image = await Image.findByPk(imageId);

        if (!image) {
            logger.error('Image not found');
            return res.status(404).send({
                message: "Image not found"
            });
        }

        // delete image from S3 bucket
        const deleteObjectCommand = new DeleteObjectCommand({
            Bucket: process.env.BUCKETNAME,
            Key: image.s3_bucket_path.substring(image.s3_bucket_path.lastIndexOf('/') + 1)
        });
        await s3.send(deleteObjectCommand);

        // delete image from database
        await image.destroy();

        logger.info('Image deleted successfully');
        return res.status(204).send({
            message: "Image deleted successfully",
        });

    } catch (error) {
        logger.error('Error parsing request');
        return res.status(400).send({
            message: 'Error parsing request',
            error: error.message,
        });
    }
});

// GET Image for a Product

app.get("/v1/product/:productId/image", async (req, res) => {
    client.increment('getallimageapi');
    logger.info('Reached GET Image for a product API');
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            logger.error('Please enter a valid email and password');
            return res.status(401).send({
                message: "Please enter a valid email and password"
            });
        }

        const auth = new Buffer.from(authHeader.split(" ")[1], "base64").toString().split(":");
        const inputEmailAddress = auth[0];
        const password = auth[1];
        if (!inputEmailAddress || !password) {
            logger.error('Please enter a valid email and password');
            return res.status(401).send({
                message: "Please enter a valid email and password"
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
            logger.error('User not found');
            return res.status(404).send({
                message: "User not found"
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            logger.error('Incorrect Password');
            return res.status(401).send({
                message: "Incorrect Password"
            });
        }
        const id = req.params.productId;
        const product = await Products.findByPk(id);

        if (!product) {
            logger.error('Product not found');
            return res.status(404).send({
                message: "Product not found"
            });
        }

        const images = await Image.findAll({
            where: {
                product_id: product.id
            },
            attributes: ['image_id', 'product_id', 'file_name', 'date_created', 's3_bucket_path'],
            order: [
                ['date_created', 'DESC']
            ]
        });

        logger.info('Retrieved all images successfully');
        return res.status(200).send({
            message: "Retrieved all images successfully",
            data: images
        });

    } catch (error) {
        logger.error('Error parsing request');
        return res.status(400).send({
            message: 'Error parsing request',
            error: error.message,
        });
    }
});

// GET Image

app.get("/v1/product/:productId/image/:image_id", async (req, res) => {
    client.increment('getimageapi');
    logger.info('Reached GET Image for a product API');
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            logger.error('Please enter a valid email and password');
            return res.status(401).send({
                message: "Please enter a valid email and password"
            });
        }

        const auth = new Buffer.from(authHeader.split(" ")[1], "base64").toString().split(":");
        const inputEmailAddress = auth[0];
        const password = auth[1];
        if (!inputEmailAddress || !password) {
            logger.error('Please enter a valid email and password');
            return res.status(401).send({
                message: "Please enter a valid email and password"
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
            logger.error('User not found');
            return res.status(404).send({
                message: "User not found"
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            logger.error('Incorrect Password');
            return res.status(401).send({
                message: "Incorrect Password"
            });
        }

        const image = await Image.findOne({
            where: {
                image_id: req.params.image_id
            },
            include: [{
                model: Products,
                where: {
                    id: req.params.productId,
                    owner_user_id: user.id
                },
            }]
        });

        if (!image) {
            logger.error('Image not found');
            return res.status(404).send({
                message: "Image not found"
            });
        }
        logger.info('Image details retrieved successfully');
        return res.status(200).send({
            data: image.toJSON()
        });

    } catch (error) {
        logger.error('Error parsing request');
        return res.status(400).send({
            message: 'Error parsing request',
            error: error.message,
        });
    }
});

// Set port number to 8080
const port = "8080"
app.listen(port, () => logger.info(`Server Started on port ${port}...`))

module.exports = app;