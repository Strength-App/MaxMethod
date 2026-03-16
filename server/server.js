import express from "express";
import cors from "cors";
import dotenv from "dotenv";
//import db from "./db/connection.js";
// node --env-file=config.env server
import users from "./routes/users.js";

dotenv.config()
const PORT = process.env.PORT || 5050;
const app = express();

app.use(cors());
app.use(express.json());
app.use("/users", users);

// start the Express server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});