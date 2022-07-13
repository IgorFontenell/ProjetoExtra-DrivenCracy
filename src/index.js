import express from "express";
import cors from "cors";
import dotenv from "dotenv";
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



// Configura que função será executada quando um GET bater na rota "/".
server.get("/", (request, response) => {
  
  // Manda como resposta um Hello World.
  response.send("Hello World");

});

server.listen(process.env.PORT, () => console.log("Servidor rodando na porta " + process.env.PORT)); // Configura o servidor para rodar na porta 5000 da minha máquina.'