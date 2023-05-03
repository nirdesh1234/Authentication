const express = require("express");
const mongoose = require("mongoose");
mongoose.connect("mongodb://127.0.0.1:27017/usersDB");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const passportLocalMongoose = require("passport-local-mongoose");
const session = require("express-session");
const dotenv = require("dotenv").config();
var findOrCreate = require("mongoose-findorcreate");

const app = express();
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static("public"));
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  secret: String,
  googleId: String,
});
const secret = "DONTletanyoneknow";

app.use(
  session({
    secret: "keyboard cat",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  })
);
app.use(passport.initialize());
app.use(passport.session());

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
const User = mongoose.model("User", userSchema); //since you are passing userSchema as a parameter it is important to create userschema plugin upwards
passport.use(User.createStrategy());
// this works not only for local authentication but for any authentication
passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, {
      id: user.id,
      username: user.username,
      picture: user.picture,
    });
  });
});

passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user);
  });
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
    },
    function (accessToken, refreshToken, profile, cb) {
      console.log(profile);
      User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

app.get(
  "/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    res.redirect("/secrets");
  }
);

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/logout", function (req, res, next) {
  req.logout(function (err) {
    if (err) {
      return next(err);
    } else {
      res.redirect("/");
    }
  });
});

app.get("/secrets", async (req, res) => {
  try {
    const findUser = await User.find({ secret: { $ne: null } });
    if (findUser) {
      res.render("secrets", { userWithSecrets: findUser });
    }
  } catch (error) {
    console.error(error);
  }
});

app.get("/submit", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.post("/submit", async (req, res) => {
  // console.log(req.user);
  const submittedSecret = req.body.secret;
  try {
    const findWhoSubmitted = await User.findById(req.user.id);
    if (findWhoSubmitted) {
      findWhoSubmitted.secret = submittedSecret;
      findWhoSubmitted
        .save()
        .then((msg) => {
          res.redirect("secrets");
        })
        .catch((err) => {
          console.log("couldnot submit due to", err);
        });
    }
  } catch (error) {
    console.error(error);
  }
});

app.post("/register", async (req, res) => {
  try {
    // Register the user with the given username and password, and set 'active' to false
    const user = await User.register(
      { username: req.body.username, active: false },
      req.body.password
    );
    // Authenticate the user using the registered username and password
    const authenticate = User.authenticate();
    authenticate(req.body.username, req.body.password, function (err, result) {
      if (err) {
        console.error(err);
        res.redirect("/register");
      } else {
        // Redirect to the secrets page if the user is authenticated
        res.redirect("/secrets");
      }
    });
  } catch (err) {
    // Handle any errors that occur during user registration
    console.error(err);
    res.redirect("/register");
  }
});

// If you are using req.login to authenticate users, it is likely that the code is not handling errors properly. When a user provides incorrect login credentials, req.login will fail and you need to handle the error in the callback function
app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/secrets",
    failureRedirect: "/login",
  })
);

app.listen(3000, (req, res) => {
  console.log("server started at port 3000");
});

// db.users.dropIndex("username_1")
//  db.users.createIndex({username: 1}, {name: "newIndexName", sparse: true})
// add this command in the mongodb shell
// First, we drop the duplicate index so that the parser can accept null values for the username field.
// Then, when we turn the parser back on by creating a new index, we specify sparse: true which tells the parser
// to only index documents where the username field is present and not null.
//  So, any future documents without a username field will be ignored by the index.

// for one user to submit more than one secret
// const userSchema = new mongoose.Schema({
//   email: String,
//   password: String,
//   secrets: [String], // an array of strings
// });
// app.post("/submit", async (req, res) => {
//   const submittedSecret = req.body.secret;
//   try {
//     const currentUser = await User.findById(req.user.id);
//     if (currentUser) {
//       currentUser.secrets.push(submittedSecret);
//       await currentUser.save();
//       res.redirect("secrets");
//     }
//   } catch (error) {
//     console.error(error);
//   }
// });
// app.get("/secrets", async (req, res) => {
//   try {
//     const users = await User.find();
//     const secrets = users
//       .filter((user) => user.secrets.length > 0)
//       .flatMap((user) => user.secrets);
//     res.render("secrets", { userWithSecrets: secrets });
//   } catch (error) {
//     console.error(error);
//   }
// });
