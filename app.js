const express = require("express");
const mongoose = require("mongoose");
mongoose.connect("mongodb://127.0.0.1:27017/usersDB");
// const encrypt = require("mongoose-encryption");
const bcrypt = require('bcrypt');
const saltRounds = 10;
// var md5 = require('md5'); time for salting now
const app = express();
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static("public"));
const userSchema = new mongoose.Schema({
  email: "String",
  password: "String",
});

const secret = "DONTletanyoneknow";
// userSchema.plugin(encrypt, { secret: secret }); // however we are not encrypting all the documents only password
// userSchema.plugin(encrypt, { secret: secret, encryptedFields: ["password"] }); // working with hash functions

const User = mongoose.model("User", userSchema); //since you are passing userSchema as a parameter it is important to create userschema plugin upwards

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/secrets", (req, res) => {
  res.render("secrets");
});

app.get("/submit", (req, res) => {
  res.render("submit");
});

app.post("/register", async (req, res) => {
  bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
    const newUser = new User({
      email: req.body.username,
      // password: md5(req.body.password),
      password: hash
    });
     newUser
      .save()
      .then((msg) => {
        res.render("secrets");
      })
      .catch((err) => {
        console.error(err);
      });
});
 
});

app.post("/login", async (req, res) => {
  const username = req.body.username;
  // const password = md5(req.body.password);
  const password = req.body.password;
  try {
    const found = await User.findOne({ email: username });
    if (found) {
      // mongoose encryption works by encrypting during save and decrypting during find as said in documentation
      bcrypt.compare(password, found.password, function(err, result) {
        if (result == true) {
          res.render("secrets");
        } else {
          res.send("Username or password incorrect");
        }
      });
    }
  } catch (error) {
    console.error(error);
  }
});


app.listen(3000, (req, res) => {
  console.log("server started at port 3000");
});
