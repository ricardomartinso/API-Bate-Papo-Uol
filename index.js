import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import joi from "joi";
import dayjs from "dayjs";

const app = express();
dotenv.config();
app.use(cors());
app.use(express.json());

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

mongoClient.connect().then(() => {
  db = mongoClient.db("api-batepapo-uol");
});
const userSchema = joi.object({
  name: joi.string().required(),
});
const messageSchema = joi.object({
  to: joi.string().required(),
  text: joi.string().required(),
  type: joi.string().equal("message", "private_message").required(),
  from: joi.string().required(),
  time: joi.string().required(),
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
  const validation = userSchema.validate(req.body, { abortEarly: false });

  if (validation.error) {
    const errors = validation.error.details.map((item) => item.message);
    res.status(422).send(errors);
    return;
  }

  try {
    const users = await db.collection("participants").find().toArray();
    const repeatedUser = users.filter((user) => user.name === req.body.name);

    if (repeatedUser.length === 1) {
      res.sendStatus(409);
      return;
    }
    await db.collection("messages").insertOne({
      from: req.body.name,
      to: "Todos",
      type: "status",
      text: "entra na sala...",
      time: dayjs().format("HH:mm:ss"),
    });
    await db
      .collection("participants")
      .insertOne({ name: req.body.name, lastStatus: Date.now() });
    res.status(201).send();
  } catch (err) {
    console.log(err);
    res.sendStatus(422);
  }
});

app.get("/messages", async (req, res) => {
  const user = req.headers.user;
  const limit = parseInt(req.query.limit);
  const messages = await db.collection("messages").find().toArray();

  const filteredMessages = messages.filter((message) => {
    if (
      message.to === "Todos" ||
      message.to === user ||
      message.from === user ||
      message.type === "message"
    ) {
      return true;
    }
  });

  if (limit === NaN) {
    res.send(filteredMessages);
    return;
  }

  res.send(filteredMessages.slice(-`${limit}`));
});

app.post("/messages", async (req, res) => {
  const { to, text, type } = req.body;
  const { user } = req.headers;
  const userMessage = {
    to,
    text,
    type,
    from: user,
    time: dayjs().format("HH:mm:ss"),
  };
  const validation = messageSchema.validate(userMessage);
  const userExist = await db.collection("participants").findOne({ name: user });

  if (!userExist) {
    return res.status(422).send("Usuário não existe");
  }

  if (validation.error) {
    const errors = validation.error.details.map((item) => item.message);
    return res.status(422).send(errors);
  }
  try {
    await db.collection("messages").insertOne(userMessage);
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
    if (participantExist.length === 0) {
      return res.status(404).send();
    }
    await db.collection("participants").updateOne(
      { name: user },
      {
        $set: {
          lastStatus: Date.now(),
        },
      }
    );
    res.status(200).send();
  } catch (err) {
    console.log(err);
    res.sendStatus(404);
  }
});

setInterval(async () => {
  let timeInMs = Date.now();
  const participants = await db.collection("participants").find().toArray();
  console.log("rodou um delete");

  participants.map(async (time) => {
    if (timeInMs - time.lastStatus >= 10000) {
      await db.collection("messages").insertOne({
        from: time.name,
        to: "Todos",
        text: "sai da sala...",
        type: "status",
        time: dayjs().format("HH:mm:ss"),
      });
      console.log("rodou a msg de sair da sala");

      await db
        .collection("participants")
        .deleteOne({ _id: new ObjectId(time._id) });
      console.log(`deletou o ${time.name}`);
    }
  });
}, 15000);

app.listen(5000);
