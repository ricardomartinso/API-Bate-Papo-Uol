import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";

const app = express();
app.use(cors());
app.use(express.json());

const mongoClient = new MongoClient("mongodb://127.0.0.1:27017");
let db;

mongoClient.connect().then(() => {
  db = mongoClient.db("api-batepapo-uol");
});

app.get("/participants", (req, res) => {
  db.collection("participants")
    .find()
    .toArray()
    .then((participants) => {
      res.send(participants);
    });
});

app.post("/participants", (req, res) => {
  if (!req.body.name) {
    res.sendStatus(422);
    return;
  }
  const usersPromise = db.collection("participants").find().toArray();

  usersPromise.then((participants) => {
    const repeatedUser = participants.filter(
      (user) => user.name === req.body.name
    );

    if (repeatedUser.length === 1) {
      res.sendStatus(409);
      return;
    } else {
      db.collection("participants")
        .insertOne({ name: req.body.name, lastStatus: Date.now() })
        .then(() => {
          res.sendStatus(201);
        });
    }
  });
});

app.listen(5000);
