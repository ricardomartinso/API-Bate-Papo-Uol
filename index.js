import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

const app = express();
dotenv.config();
app.use(cors());
app.use(express.json());

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

mongoClient.connect().then(() => {
  db = mongoClient.db("api-batepapo-uol");
});

app.get("/participants", async (req, res) => {
  try {
    const participants = await db.collection("participants").find().toArray();
    res.send(participants);
  } catch {
    res.sendStatus(422);
  }
});

app.post("/participants", async (req, res) => {
  if (!req.body.name) {
    res.sendStatus(422);
    return;
  }
  try {
    const users = await db.collection("participants").find().toArray();
    const repeatedUser = users.filter((user) => user.name === req.body.name);

    if (repeatedUser.length === 1) {
      res.sendStatus(409);
      return;
    } else {
      await db
        .collection("participants")
        .insertOne({ name: req.body.name, lastStatus: Date.now() });
      res.sendStatus(201);
    }
  } catch (err) {
    console.log(err);
    res.sendStatus(422);
  }
});

app.get("/messages", async (req, res) => {
  const user = req.headers.user;
  const limit = parseInt(req.query.limit);
  const messages = await db.collection("messages").find().toArray();

  if (limit === NaN) {
    res.send(messages);
    return;
  }
  res.send(messages.slice(-`${limit}`));
});

app.post("/messages", async (req, res) => {
  const { to, text, type } = req.body;
  const { user } = req.headers;
  try {
    if (!to || !text) {
      res.sendStatus(422);
      return;
    }
    await db.collection("messages").insertOne({ to, text, type, from: user });
    res.sendStatus(201);
  } catch (err) {
    console.log(err);
    res.sendStatus(422);
  }
});
app.post("/status", async (req, res) => {
  const { user } = req.headers;
  try {
    const participants = await db.collection("participants").find().toArray();
    const participantExist = participants.filter(
      (participant) => participant.name === user
    );
    if (participantExist.length === 0 || participantExist === undefined) {
      res.sendStatus(404);
    } else {
      res.sendStatus(200);
    }
  } catch (err) {
    console.log(err);
    res.sendStatus(404);
  }
});
app.listen(5000);
