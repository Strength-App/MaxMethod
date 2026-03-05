import express from "express";
import cors from "cors";
import dotenv from "dotenv";
//import db from "./db/connection.js";
// node --env-file=config.env server
import users from "./routes/users.js";
import * as path from "path";

dotenv.config()
const PORT = process.env.PORT || 5050;
const app = express();
const corsOptions = {
  origin: "http://localhost:5173",
  optionsSuccessStatus: 200

};


dotenv.config();
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Home, Classification, Goals pages, History, Settings
app.get("/", cors(corsOptions), (req, res) => {
   res.sendFile(path.join(__dirname, "../client/max-method/src/index.html"));
});


// start the Express server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
