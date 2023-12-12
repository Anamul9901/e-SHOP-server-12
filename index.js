const express = require('express');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
const port = process.env.PORT || 5000;


// middelware
app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://anamul-12.surge.sh',
        'https://assignment-12-f43f7.web.app',
        'https://anamulhaque-12.surge.sh/'
    ],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zkbgco3.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});



async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();


        const userCollection = client.db('shopDb').collection('user');
        const storeCollection = client.db('shopDb').collection('store');
        const productCollection = client.db('shopDb').collection('products');
        const soldProductCollection = client.db('shopDb').collection('soldProducts')


        // middlewares
        const verifyToken = (req, res, next) => {
            const token = req?.cookies?.token;
            // console.log('token in the middleware: ', token);
            if (!token) {
                return res.status(401).send({ message: 'unauthorized access' })
            }
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorized access' })
                }
                req.decoded = decoded;
                next();
            })
        }

        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            next();
        }

        const verifyModarator = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            const isModarator = user?.role === 'modarator' || 'admin';
            if (!isModarator) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            next();
        }


        // auth relate api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            // console.log('user for token', user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.cookie('token', token, {
                httpOnly: true,
                secure: true,
                sameSite: 'none'
            })
                .send(token);
        })

        app.post('/logout', async (req, res) => {
            const user = req.body;
            // console.log('logging out:', user)
            res.clearCookie('token', { maxAge: 0 })
                .send({ success: true })
        })

        // user related api
        app.get('/users', verifyToken, verifyModarator, async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        })

        app.get('/users/modarator/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            if (user) {
                modarator = user?.role === 'modarator';
            }
            res.send({ modarator, user })
        })
// created by ANAMUL HAUE1
        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            let admin = false;
            if (user) {
                admin = user?.role === 'admin';
            }
            res.send({ admin })
        })

        app.post('/users', async (req, res) => {
            const createUser = req.body;
            const result = await userCollection.insertOne(createUser);
            res.send(result);
        })

        app.patch('/users/modarator/:email', async (req, res) => {
            const data = req.params;
            const data2 = req.body;
            // console.log('email', data.email)
            const filter = { email: data.email };
            const updatedDoc = {
                $set: {
                    role: 'modarator',
                    shopName: data2.shopName,
                    shopLogo: data2.shopLogo,
                    productLimit: data2.productLimit,
                    totalCost: data2.totalCost,
                    totalSale: data2.totalSale
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })

        app.patch('/users/modarator-cost/:email', async (req, res) => {
            const data = req.params;
            const data2 = req.body;
            // console.log('email', data.email)
            const filter = { email: data.email };
            const updatedDoc = {
                $set: {
                    totalCost: data2.updateCost
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })

        app.patch('/users/admin/:email', async (req, res) => {
            const data = req.params;
            const data2 = req.body;
            console.log('email', data.email)
            const filter = { email: data.email };
            const updatedDoc = {
                $set: {
                    adminIncome: data2.adminNewIncome
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })

        app.patch('/users/:email', async (req, res) => {
            const email = req.params.email;
            const data = req.body;
            // console.log(email, data);
            const filter = { email: email };
            const updatedDoc = {
                $set: {
                    productLimit: data.Limit
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })




        // store related api
        app.get('/store', verifyToken, verifyModarator, async (req, res) => {
            const result = await storeCollection.find().toArray();
            res.send(result);
        })

        app.post('/store', async (req, res) => {
            const createStore = req.body;
            const result = await storeCollection.insertOne(createStore);
            res.send(result);
        })

        // products related api
        app.get('/products', verifyToken, verifyModarator, async (req, res) => {
            // console.log(req.query.userEmail);
            let query = {};
            if (req.query?.userEmail) {
                query = { userEmail: req.query.userEmail }
            }
            const result = await productCollection.find(query).toArray();
            res.send(result);
        })

        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await productCollection.findOne(query);
            res.send(result);
        })

        app.post('/products', async (req, res) => {
            const newProsuct = req.body;
            const result = await productCollection.insertOne(newProsuct);
            res.send(result);
        })

        app.delete('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await productCollection.deleteOne(query);
            res.send(result);
        })

        app.put('/products/:id', async (req, res) => {
            const id = req.params.id;
            const data = req.body;
            // console.log('selling Price:', data.sellingPrice)
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true }
            const updatedProduct = {
                $set: {
                    userEmail: data.userEmail,
                    productName: data.productName,
                    productImage: data.productImage,
                    quantity: data.quantity,
                    location: data.location,
                    cost: data.cost,
                    profit: data.profit,
                    discount: data.discount,
                    description: data.description,
                    sellingPrice: data.sellingPrice,
                    saleCount: data.saleCount2
                }
            }
            const result = await productCollection.updateOne(filter, updatedProduct, options);

            res.send(result);
        })

        app.patch('/products/:id', async (req, res) => {
            const id = req.params.id;
            const data = req.body;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    sold: 'yes',
                    saleCount: data.patchSaleCount,
                    quantity: data.patchQuantity
                }
            }
            const result = await productCollection.updateOne(filter, updatedDoc)
            res.send(result);
        })

        app.patch('/products-sold/:id', async (req, res) => {
            const id = req.params.id;
            const data = req.body;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    sold: 'yes',
                     
                }
            }
            const result = await productCollection.updateOne(filter, updatedDoc)
            res.send(result);
        })



        // payment related api
        app.post('/create-payment-intent', verifyToken, async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);
            // console.log(amount, 'amount inside the intent')

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });

            res.send({
                clientSecret: paymentIntent.client_secret
            })
        })


        // sold product related api
        app.get('/sold-product', async (req, res) => {
            const result = await soldProductCollection.find().toArray();
            res.send(result);
        })

        app.post('/sold-product', async (req, res) => {
            const soldProduct = req.body;
            const result = await soldProductCollection.insertOne(soldProduct);
            res.send(result);
        })

        app.put('/sold-product/:id', async (req, res) => {
            const id = req.params.id;
            const data = req.body;
            // console.log('selling Price:', data.sellingPrice)
            const filter = { _id: id }
            const options = { upsert: true }
            const updatedProduct = {
                $set: {
                    userEmail: data.userEmail,
                    productName: data.productName,
                    productImage: data.productImage,
                    quantity: data.quantity,
                    location: data.location,
                    cost: data.cost,
                    profit: data.profit,
                    discount: data.discount,
                    description: data.description,
                    sellingPrice: data.sellingPrice,
                    saleCount: data.saleCount2
                }
            }
            const result = await soldProductCollection.updateOne(filter, updatedProduct, options);

            res.send(result);
        })

        app.delete('/sold-product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: id };
            const resutl = await soldProductCollection.deleteOne(query)
            res.send(resutl);
        })




        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('assignment-12 is running')
})

app.listen(port, () => {
    console.log(`Assignment-12 is running on port ${port}`)
})
