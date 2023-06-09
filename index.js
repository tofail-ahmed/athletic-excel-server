const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
// const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);
const port = process.env.PORT || 5000;


app.use(cors());
app.use(express.json());

// const verifyJWT = (req, res, next) => {
//       const authorization = req.headers.authorization;
//       if (!authorization) {
//             return res.status(401).send({ error: true, message: "unauthorized access" })
//       }
//       const token = authorization.split(' ')[1];

//       jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
//             if (err) {
//                   return res.status(401).send({ error: true, message: "unauthorized access" })
//             }
//             req.decoded = decoded;
//             next();
//       })
// }



const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zhsy6ko.mongodb.net/?retryWrites=true&w=majority`;

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
            await client.connect();




            const classCollection = client.db("athleteDB").collection("classes")
            const userCollection = client.db("athleteDB").collection("users")

            app.get('/classes', async (req, res) => {
                  const result = await classCollection.find().toArray();
                  res.send(result)
            })



            app.post('/jwt', (req, res) => {
                  const user = req.body;
                  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                        expiresIn: '1h'
                  })
                  res.send({ token })
            })



            app.post('/users', async (req, res) => {
                  const user = req.body;
                  const query = { email: user.email }
                  const existingUser = await userCollection.findOne(query);

                  if (existingUser) {
                        return res.send({ message: 'user already exists' })
                  }

                  const result = await userCollection.insertOne(user);
                  res.send(result);
            });

            app.get('/users', async (req, res) => {
                  const result = await userCollection.find().toArray();
                  res.send(result)
            })

            // Send a ping to confirm a successful connection
            await client.db("admin").command({ ping: 1 });
            console.log("Pinged your deployment. You successfully connected to MongoDB!");
      } finally {
            // Ensures that the client will close when you finish/error
            //     await client.close();
      }
}
run().catch(console.dir);









app.get('/', async (req, res) => {
      res.send("Athletic Excel flying")
})


app.listen(port, () => {
      console.log("Athlete is running");
})