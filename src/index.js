import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import joi from "joi";
import dayjs from 'dayjs';
import { MongoClient } from "mongodb";



dotenv.config();

const server = express(); // Cria o servidor.
server.use(express.json()); // Torna legível os dados recebidos.
server.use(cors()); // Permite o acesso de outras portas ao código rodando.



const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

mongoClient.connect().then(() => {
  db = mongoClient.db(process.env.MONGO_DATABASE);
})

let now = dayjs().format("YYYY-MM-DD HH:mm");


server.post("/poll", async (request, response) => {
    const post = request.body; // Getting the post from the front-end.

    const postSchema = joi.object({
      title: joi.string().required(),
      expireAt: joi.string()
    }); // Creating the joi Schema.

    const validation = postSchema.validate(post); // Validating the post with the Schema as a criterion.
    
    if(validation.error) { 
      response.sendStatus(422);
      return;
    } // If the validation weren't aproved return status 422.

    let newPost = {...post}; // newPost is getting all the info in the post variable.

    if(!post.expireAt) {
      let expireDate = dayjs().add(30, 'day');
      expireDate = expireDate.format("YYYY-MM-DD HH:mm");

      newPost = {...newPost, expireAt: expireDate};
    } // In case of no expire date the code must put it 30 days after the post was done.

    await db.collection("posts").insertOne({...newPost}); // Sending to the mongoDB our post.
    
    response.sendStatus(201); // Returning the 201 status ("Item created").
});


server.get("/poll", async (request, response) => {
  const posts = await db.collection("posts").find({}).toArray();
  
  response.send(posts);
});

server.post("/pollsss", (request, response) => {

});

// Configura que função será executada quando um GET bater na rota "/".
server.get("/", (request, response) => {
  
  // Manda como resposta um Hello World.
  response.send("Hello World");

});

server.listen(process.env.PORT, () => console.log("Servidor rodando na porta " + process.env.PORT)); // Configura o servidor para rodar na porta 5000 da minha máquina.'