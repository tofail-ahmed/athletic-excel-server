const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');

require('dotenv').config();
// const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);
const port = process.env.PORT || 5000;


app.use(cors());
app.use(express.json());

//verifying Json web token------------------------
const verifyJWT = (req, res, next) => {
      const authorization = req.headers.authorization;
      if (!authorization) {
            return res.status(401).send({ error: true, message: "unauthorized access" })
      }
      const token = authorization.split(' ')[1];

      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
            if (err) {
                  return res.status(401).send({ error: true, message: "unauthorized access" })
            }
            req.decoded = decoded;
            next();
      })
}



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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


            //------------------------collections----------

            const classCollection = client.db("athleteDB").collection("classes")
            const userCollection = client.db("athleteDB").collection("users")
            const cartCollection = client.db("athleteDB").collection("carts")


            //-------------------------classsess---------------------//-----------------------
            app.get('/allclasses', async (req, res) => {
                  const result = await classCollection.find().toArray();
                  res.send(result)
            })
            app.get('/approvedclasses', async (req, res) => {
                  const result = await classCollection.find({ status: "approved" }).toArray();
                  res.send(result);
                });

            app.get('/classes/instructorClass/:email', async (req, res) => {
                  const email = req.params.email;
                  const result = await classCollection.find({ "instructor.email": email }).toArray();
                  res.send(result);
            });





            //---------------------approve class----------------//-------------------------
            app.patch('/classes/approve/:id', async (req, res) => {
                  const id = req.params.id;
                  console.log("id from approve", id);
                  const filter = { _id: new ObjectId(id) };
                  const updateDoc = {
                        $set: {
                              status: "approved"
                        }
                  };
                  const result = await classCollection.updateOne(filter, updateDoc);
                  res.send(result);
            })

                // ------------------- //deny classss---------------
            app.patch('/classes/deny/:id', async (req, res) => {
                  const id = req.params.id;
                  console.log("id from deny", id);
                  const filter = { _id: new ObjectId(id) };
                  const updateDoc = {
                        $set: {
                              status: "denied"
                        }
                  };
                  const result = await classCollection.updateOne(filter, updateDoc);
                  res.send(result);
            })

            app.get('/sixclasses', async (req, res) => {
                  const topSixClass = await classCollection.find({ status: "approved" }).sort({ students: -1 }).limit(6).toArray();
                  res.send(topSixClass)
            })

         

            app.post('/classes', async (req, res) => {
                  const newClass = req.body;
                  console.log(newClass);
                  const result = await classCollection.insertOne(newClass);
                  res.send(result)
            }
            );


                  //----------------------jwt------------
            app.post('/jwt', (req, res) => {
                  const user = req.body;
                  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                        expiresIn: '1h'
                  })
                  res.send({ token })
            })


            //---------------------users--------
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



            //-------------------------admin------------------
            app.patch('/users/admin/:id', async (req, res) => {
                  const id = req.params.id;
                  console.log(id);
                  const filter = { _id: new ObjectId(id) };
                  const updateDoc = {
                        $set: {
                              role: 'admin'
                        },
                  };

                  const result = await userCollection.updateOne(filter, updateDoc);
                  res.send(result);

            })
            app.get('/users/admin/:email', async (req, res) => {
                  const email = req.params.email;

                  // if (req.decoded.email !== email) {
                  //       return res.send({ admin: false })
                  // }

                  const query = { email: email }
                  const user = await userCollection.findOne(query);
                  const result = { admin: user?.role === 'admin' }
                  res.send(result);
            })



            //-----------------------------instructor-----------


            app.get('/users/instructor/:email', async (req, res) => {
                  const email = req.params.email;
                  console.log(email);
                  // if (req.decoded.email !== email) {
                  //       return res.send({ admin: false })
                  // }

                  const query = { email: email }
                  const user = await userCollection.findOne(query);
                  const result = { instructor: user?.role === 'instructor' }
                  res.send(result);
            })


            app.patch('/users/instructor/:id', async (req, res) => {
                  const id = req.params.id;
                  console.log(id);
                  const filter = { _id: new ObjectId(id) };
                  const updateDoc = {
                        $set: {
                              role: 'instructor'
                        },
                  };

                  const result = await userCollection.updateOne(filter, updateDoc);
                  res.send(result);

            })

            //---------------------------carts------------

            // app.get('/carts/:email', async (req, res) => {

            //       const email = req.params.email;
            //       const carts = await cartCollection.find({ email }).toArray();

            //       if (carts.length === 0) {
            //         return res.status(404).send({ error: 'No carts found for the email' });
            //       }

            //       res.send(carts);
            // });
            app.get('/carts', verifyJWT, async (req, res) => {
                  const email = req.query.email;
                  console.log(email);
                  if (!email) {
                        res.send([]);
                  }

                  const decodedEmail = req.decoded.email;
                  if (email !== decodedEmail) {
                        return res.status(403).send({ error: true, message: 'forbidden access' })
                  }

                  const query = { email: email };
                  const result = await cartCollection.find(query).toArray();
                  res.send(result);
            })


            app.post('/carts', async (req, res) => {
                  const item = req.body;
                  const result = await cartCollection.insertOne(item);
                  res.send(result);
            })

            app.delete('/carts/:id',async(req,res)=>{
                  const id =req.params.id;
                  // const query = { _id: new ObjectId(id) };
                  const result=await cartCollection.deleteOne({_id: new ObjectId(id)});
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