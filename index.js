const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dp83dff.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    client.connect();
    const usersCollection = client.db("danceClass").collection("users");
    const classesCollection = client.db("danceClass").collection("classes");
    const selectClsCollection = client.db("danceClass").collection("selectCls");
    const paymentCollection = client.db("danceClass").collection("payment");
    //  user collection
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });
    app.get("/users/instructor", async (req, res) => {
      const query = { role: "Instructor" };
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;

      //   if (req.decoded.email !== email) {
      //     res.send({ admin: false });
      //   }

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let result;
      if (user?.role === "Admin") {
        return res.send({ message: "Admin" });
      } else if (user?.role === "Instructor") {
        return res.send({ message: "Instructor" });
      } else {
        return res.send({ message: "Student" });
      }
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: "user already exists" });
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.patch("/users/instructor/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "Instructor",
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "Admin",
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    // classes section
    app.get("/classes", async (req, res) => {
      const result = await classesCollection.find().toArray();
      res.send(result);
    });
    app.get("/classes/approved", async (req, res) => {
      const query = { status: "Approved" };
      const result = await classesCollection.find(query).toArray();
      res.send(result);
    });
    app.post("/classes", async (req, res) => {
      const newItem = req.body;
      const result = await classesCollection.insertOne(newItem);
      res.send(result);
    });
    app.patch("/classes/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedStatus = req.body;
      console.log(updatedStatus);
      const updateDoc = {
        $set: {
          status: updatedStatus.status,
        },
      };
      const result = await classesCollection.updateOne(filter, updateDoc);

      res.send(result);
    });
    app.patch("/classFeedback/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const addFeedback = req.body;
      // console.log(addFeedback);
      const updateDoc = {
        $set: {
          feedback: addFeedback.feedback,
        },
      };
      const result = await classesCollection.updateOne(filter, updateDoc);

      res.send(result);
    });
    // selected class cart
    app.get("/selectClasses/:email", async (req, res) => {
      const email = req.params.email;
      const query = { userEmail: email };
      const result = await selectClsCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/enrollClasses/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const paymentData = await paymentCollection.find(query).toArray();
      const classIds = paymentData.map((data) =>
        data.classId.map((cls) => cls)
      );
      const mergedArray = [].concat(...classIds);
      const classes = await classesCollection
        .find({ _id: { $in: mergedArray.map((id) => new ObjectId(id)) } })
        .toArray();
      res.send(classes);
    });
    app.delete("/selectClass/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await selectClsCollection.deleteOne(query);
      res.send(result);
    });
    app.post("/selectClasses", async (req, res) => {
      const newItem = req.body;
      console.log(newItem);
      const query = { _id: new ObjectId(newItem._id) };
      const existingUser = await selectClsCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: "Class already Selected" });
      }
      const result = await selectClsCollection.insertOne(newItem);
      res.send(result);
    });
    // payment
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
    app.get("/payments/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await paymentCollection.find(query).sort({ date: -1 }).toArray();
      res.send(result);
    });

    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const insertResult = await paymentCollection.insertOne(payment);

      const query = {
        _id: { $in: payment.cartItems.map((id) => new ObjectId(id)) },
      };
      const filter = {
        _id: { $in: payment.classId.map((id) => new ObjectId(id)) },
      };
      const updateDoc = {
        $inc: { seats: -1 },
      };
      const updateSeats = await classesCollection.updateMany(filter, updateDoc);
      const deleteResult = await selectClsCollection.deleteMany(query);

      res.send({ insertResult, deleteResult, updateSeats });
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Summer Camp is running............yey!!");
});

app.listen(port, () => {
  console.log(`Bistro boss is sitting on port ${port}`);
});
