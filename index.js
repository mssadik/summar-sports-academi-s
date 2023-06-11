const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY);
require('dotenv').config();
const port = process.env.PORT || 5000;

//all middleware here
app.use(cors());
app.use(express.json());


const verifyJWT = (req, res, next) =>{
  const authorization = req.headers.authorization;
  console.log(authorization);
  if(!authorization){
    
    return res.status(401).send({error: true, message: 'unsuthroised access 11'});
  }
  const token = authorization.spilt(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) =>{
    if(err){
      return res.status(401).send({error: true, message: 'unsuthroised access 22'})
    }
    req.decoded = decoded;
    console.log(req.decoded);
    next();
  })
}


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mhsnbkd.mongodb.net/?retryWrites=true&w=majority`;

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

    const classesCollection = client.db("sports").collection("classesCollection");
    const classessCartCollection = client.db("sports").collection("classessCartCollection");
    const instructorsCollection = client.db("sports").collection("instructorsCollection");
    const reviewCollection = client.db("sports").collection("reviewCollection");
    const usersCollection = client.db("sports").collection("usersCollection");

    // json web token
    app.post('/jwt', (req, res) =>{
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h'})
      res.send({token});
    })

    // users apis
    app.get('/users', async(req, res) =>{
      const result = await usersCollection.find().toArray();
      res.send(result);
    })
    


    // make admin api
    // TODO:  verifyJWT 
    app.get('/users/admin/:email', async(req, res) =>{
      const email = req.params.email;


      // if(req.decoded.email !== email){
      //   res.send({admin: false})
      // }

      const query = {email: email};
      const user = await usersCollection.findOne(query);
      const result = {admin: user?.role === 'admin'}
      res.send(result);
    })


    // make instructor api
    app.get('/users/instructor/:email', async(req, res) =>{
      const email = req.params.email;


      // if(req.decoded.email !== email){
      //   res.send({instructor: false})
      // }

      const query = {email: email};
      const user = await usersCollection.findOne(query);
      const result = {instructor: user?.role === 'instructor'}
      res.send(result);
    })



    app.post('/users', async(req, res) =>{
      
      const user = req.body;
      const query = {email: user.email}
      const existingUser = await usersCollection.findOne(query);
      if(existingUser){
        return res.send({message: 'user already exists'})
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    })

    
    app.patch('/users/admin/:id', async(req, res) =>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await usersCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })

    app.patch('/users/instructor/:id', async(req, res) =>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updatedDoc = {
        $set: {
          role: 'instructor'
        }
      }
      const result = await usersCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })

    app.delete('/users/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    })
    

    // classess collections here
    app.get('/classes', async (req, res) => {
      const result = await classesCollection.find().toArray();
      res.send(result);
    })

    app.post('/classes', async (req, res) => {
      const item = req.body;
      const result = await classesCollection.insertOne(item);
      res.send(result);
    })

    //----------------------------------------
    app.get('/classes/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await classesCollection.findOne(query)
      res.send(result);
    })

    app.put('/classes/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true };
      const updatedClass = req.body;

      const classs = {
        $set: {
          class_name: updatedClass.class_name,
          class_img: updatedClass.class_img,
          instructor_name: updatedClass.instructor_name,
          instructor_email: updatedClass.instructor_email,
          available_seats: updatedClass.available_seats,
          price: updatedClass.price,
          status: updatedClass.status,
        }
      }
      const result = await classesCollection.updateOne(filter, classs, options)
      res.send(result);
    })

    // carts collections here
    //TODO; verifyJWT
    app.get('/carts', async (req, res) => {
      const email = req.query.email;

      if (!email) {
       return res.send([]);
      }

      // const decodedEmail = req.decoded.email;
      // if(email !== decodedEmail){
      //   return res.status(403).send({error: true, message: 'unauthorixed access'})
      // }

      const query = { userEmail: email };
      const result = await classessCartCollection.find(query).toArray();
      res.send(result);
    });


    //instructorcart cllection here
    app.get('/instructorCart', async (req, res) => {
      const email = req.query.email;

      if (!email) {
       return res.send([]);
      }
      const query = { userEmail: email };
      const result = await classesCollection.find(query).toArray();
      res.send(result);
    });

    app.delete('/carts/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await classessCartCollection.deleteOne(query);
      res.send(result);
    })


    // app.get('/carts', async (req, res) => {
    //   const result = await classessCartCollection.find().toArray();
    //   res.send(result);
    // });


    app.post('/carts', async (req, res) => {
      const item = req.body;
      console.log(item);
      const result = await classessCartCollection.insertOne(item);
      res.send(result);
    })

    // instroctor collections here
    app.get('/instructors', async (req, res) => {
      const result = await instructorsCollection.find().toArray();
      res.send(result);
    })

    // review collection here
    app.get('/review', async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    })

    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });
      res.send({
        clientSecret: paymentIntent.client_secret
      })
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
  res.send("too much summar")
})

app.listen(port, () => {
  console.log(`summar is running on prot: ${port}`)
})
