const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;

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
    //  user collection
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });
    app.get('/users/instructor', async(req,res)=>{
      const query = {role: 'Instructor'};
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    })
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
      const query = {status : "Approved"};
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
