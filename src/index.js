import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import joi from "joi";
import dayjs from 'dayjs';
import { MongoClient, ObjectId } from "mongodb";

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

  try {
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
    } catch {
      response.status(400).send("Não foi possível cadastrar o post!");
    }
}); // Posting the poll.


server.get("/poll", async (request, response) => {
    try {
      const posts = await db.collection("posts").find({}).toArray(); // Looking for all the posts in the DB.
  
      response.send(posts);
    } catch {
      response.status(400).send("Não foi possível pegar os posts solicitados!");
    }
  
}); // Getting all the polls.

server.post("/choice", async (request, response) => {
    try {
        const choice = request.body; // Getting the choice request from the body.

        const choiceSchema = joi.object({
          title: joi.string().required(),
          poolId: joi.string().required()
        }); // Creating the choice Schema for verification.

        const validation = choiceSchema.validate(choice); // Validating the choice using the choice Schema as parameter.

        if(validation.error) {
          return response.sendStatus(422);
        }; // If the validation fails we will be sending back the 422 status.

      
        const post = await db.collection("posts").findOne({_id: ObjectId(choice.poolId) }); // Locking for the post that has the id that was send by the front-end.
    
        if(!post) {
          return response.status(404).send("Post não encontrado");
        } // If there are no post with this id, it must send back the message "Couldn't find the post" with a 404 status.

        let dayExpire = dayjs(post.expireAt); // Getting the day that the post will expire in a dayjs format.
        let today = now; // Today's day
        let daysToExpire = dayExpire.diff(today, "day", true); // Calculating the diference in days between the expire day and today.
        
        if(daysToExpire < 0) {
          return response.status(403).send("Post já expirado!");
        } // Verifying if the post has or hasen't expired.
        
        const choiceIsRepeated = await db.collection("choices").findOne({...choice}); // Look in the DB if this choice alreday existss for this post.
        
        if(choiceIsRepeated) {
          return response.status(409).send("Title já existente para essa enquete");
        } // Returning status 409 if the choice alredy exists.
        
        await db.collection("choices").insertOne({...choice}); // Inserting the choice in the DB.
        
        response.sendStatus(201);

      } catch {
        response.status(404).send("Não foi possível cadastrar essa enquete!");
      }
    


}); // Posting an choice to the poll.

server.get("/poll/:id/choice", async (request, response) => {

    try {
      const poolId = request.params.id; // Getting the pool id from the params.
      const choices = await db.collection("choices").find({ poolId: poolId }).toArray(); // Looking for this poolId in the DB.
    
      if(choices.length === 0) {
        response.status(404).send("id não encontrado!")
        return;
      } // Verifying if there are any answers for the question or if there even exists question for this id.

      response.send(choices);

    } catch {
      response.status(400).send("Não foi possível retornar os votos!")
    }
    
}); // Getting all the choices from a given poll id.

server.post("/choice/:id/vote", async (request, response) => {
    
    try {
      const id = request.params.id; // Getting the id of the choice voted by the params.

      const vote = {
      createdAt: now,
      choiceId: ObjectId(id)
    }; // Creating the variable as the front expects.

      const FindingChoice = await db.collection("choices").findOne({_id: ObjectId(id)}); // Looking for the choice with that id.
    
      if(!FindingChoice) {
        return response.status(404).send("Não achamos esse voto!");
      } // Verifying the choice was found.
  
      const FindingPost = await db.collection("posts").findOne({_id: ObjectId(FindingChoice.poolId)}); // Finding the post refered by the choice.
      
      let dayExpire = dayjs(FindingPost.expireAt); // Getting the day that the post will expire in a dayjs format.
      let today = now; // Today's day
      let daysToExpire = dayExpire.diff(today, "day", true); // Calculating the diference in days between the expire day and today.
  
      if(daysToExpire < 0) {
        return response.status(403).send("Enquete já expirada!");
      } // Validating if the post was or wasen't expired.
  
      await db.collection("votes").insertOne({...vote}); // Inserting the vote in the "votes" DB.
    
      response.status(201).send("Voto realizado com sucesso!");

    } catch {
      response.status(400).send("Não foi possível realizar o voto!");
    }
    

}); // Voting the choice send in the id.

server.get("/poll/:id/result", async (request, response) => {
  
    try {
      const postId = request.params.id; // Getting the post id from the params.
      const post = await db.collection("posts").find({_id: ObjectId(postId)}).toArray(); // Looking if the post exists.
      const allChoices = await db.collection("choices").find({poolId: postId}).toArray(); // Looking for all Choices from the post.
      const allVotes = await db.collection("votes").find({}).toArray(); // Getting all the votes from the DB.
      

      let votes = [{}];
      
      allChoices.map(choicesObject => {
        let numberVotes =  allVotes.filter(votesObject => String(votesObject.choiceId) === String(choicesObject._id)).length

        votes = [...votes, {
          title: choicesObject.title,
          votes: numberVotes,
        }];
      }); // We frist use a map to run for all the choices linked with that post. With each choice we look for the votes that are refering to the choice id so we can filter than, save count it and save all the votes resume in the variable called "votes".
    
      let maxVote = {
        title: "",
        votes: 0
      };
      votes.map(object => {
        if(object.votes >= maxVote.votes) {
          maxVote = {
            title: object.title,
            votes: object.votes
          };
        };
      }); // Here we look for the item in the "vote" variable that has more votes and save it in the "maxVote" variable.

    const poolResult = {
      _id: String(post[0]._id),
      title: post[0].title,
      expireAt: post[0].expireAt,
      result: {
        title: maxVote.title,
        votes: maxVote.votes
        }
      } // Here we are just putting the information gathered in the format that the front-end expects
      
    
      
      response.send(poolResult);
      } catch {
        response.status(404).send("Id não encontrado");
      }
    
}); // Getting the poll result.




server.listen(process.env.PORT, () => console.log("Servidor rodando na porta " + process.env.PORT)); // Configura o servidor para rodar na porta 5000 da minha máquina.'