const express = require("express");
const exphbs = require("express-handlebars");
const multer = require("multer");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const seceret = "assd123^&*^&*ghghggh";
const oneDay = 1000 * 60 * 60 * 24;
const sessions = require("express-session");
const PORT = 9999;
const bcrypt = require("bcrypt");
const saltRounds = 10;
const app = express();
//database connection
const nodemailer = require("nodemailer");
var hbs = require("nodemailer-express-handlebars");
app.use(express.static("uploads"));
let transporter = nodemailer.createTransport({
  service: "gmail",
  port: 587,
  secure: false,
  auth: {
    user: "rishin029@gmail.com",
    pass: "hxbrqjqctqxqytcn",
  },
});
mongoose
  .connect("mongodb://127.0.0.1:27017/authmongo")
  .then((res) => console.log("DB Connected"))
  .catch((err) => console.log("Error : " + err));
//end
app.use(
  sessions({
    secret: seceret,
    saveUninitialized: true,
    cookie: { maxAge: oneDay },
    resave: false,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
transporter.use(
  "compile",
  hbs({
    viewEngine: "nodemailer-express-handlebars",
    viewPath: "emailTemplates/",
  })
);
app.engine("handlebars", exphbs.engine());
app.set("view engine", "handlebars");
app.set("views", "./views");
var path = require("path");
app.use(cookieParser());
const userModel = require("./Model/User");

var session;
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "/uploads"));
  },
  filename: function (req, file, cb) {
    fileExtension = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + Date.now() + fileExtension);
  },
});
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype == "image/png" || file.mimetype == "image/jpeg") {
      cb(null, true);
    } else {
      cb(null, false);
      return cb(new Error("only png and jpg formate support"));
    }
  },
});

app.get("/", (req, res) => {
  //let username=req.cookies.username;
  session = req.session;
  if (session.username) {
    return res.render("home", { uname: session.username });
  } else {
    return res.render("login");
  }
});
app.get("/login", (req, res) => {
  let auth = req.query.msg ? true : false;
  if (auth) {
    return res.render("login", { error: "Invalid username or password" });
  } else {
    return res.render("login");
  }
});
app.get("/upload", (req, res) => {
  res.render("upload", { succmsg: "", errmsg: "" });
});

app.post("/postlogin", (req, res) => {
  console.log("received");
  let { uname, password } = req.body;
  let name1 = /^[a-z A-Z]+$/;
  let pass1 = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,24}$/;
  let unameErr;
  let passErr;  
  if(name1.test(uname) && pass1.test(password)){
  userModel.findOne({ username: uname }, (err, data) => {
    if (err) {
      return res.redirect("/login?msg=fail");
    } else if (data == null) {
      return res.redirect("/login?msg=fail");
    } else {
    //   console.log(data.password);
      if (bcrypt.compareSync(password, data.password)) {
        session = req.session;
        session.username = uname;
        // console.log(req.session);
        return res.redirect("/welcome");
      } else {
        return res.redirect("/login?msg=fail");
      }
    }
  });
}
else{
  if(!name1.test(uname)) {
    unameErr = 'Only latter and white spaces allow ';
}
if(!pass1.test(password)) {
    passErr = 'password between 8 to 24 characters which contain at least one  uppercase,lowercase'
}
res.render('login', { unameErr: unameErr, passErr: passErr});
}
});

app.get("/regis", (req, res) => {
  res.render("regis");
});
const folderPath = __dirname + "/uploads";
app.get("/download", (req, res) => {
  let username = req.session.username;
  if (username) {
    userModel.findOne({ username: username }, (err, data) => {
      if (err) {
      } else {
        res.download(folderPath + `/${data.image}`, (err) => {
          if (err) {
          }
        });
      }
    });
  }
});
const uploadSingle = upload.single("att");
app.post("/postregis", (req, res) => {
  uploadSingle(req, res, (err) => {
    if (err) {
      res.render("upload", { errmsg: err.message, succmsg: "" });
    } else {
      let { email, uname, password,gender,position } = req.body;
      let name1 = /^[a-z A-Z]+$/;
      let email1 = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
      let pass1 = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,24}$/;
      let nameErr;
      let emailErr;
      let passErr;
      let genderErr;
      let positionErr;  
      let status = 0;
      if(name1.test(uname) && email1.test(email) && pass1.test(password)) {
        const hash = bcrypt.hashSync(password, saltRounds);
        userModel
          .create({
            email: email,
            username: uname,
            password: hash,
            image: req.file.filename,
            position: position,
            gender: gender,
            status: status,
          })
  
          .then((data) => {
            let mailOptions = {
              from: "rishin029@gmail.com",
              to: email,
              subject: "Testing Mail",
              template: "mail",
              context: {
                id: data._id,
                uname: uname,
              },
            };
            transporter.sendMail(mailOptions, (err, info) => {
              if (err) {
                console.log(err);
              } else {
                console.log("Mail send : " + id);
              }
            });
           res.render("upload", {
          errmsg: "",
          succmsg:"You have registred sucessfully kindly check your mail to activate your account",
        });
          })
          .catch((err) => {
            res.render("regis", { error: "User Already Registered" });
          });
        }
        else {
            if(!name1.test(uname)) {
                nameErr = 'Only latter and white spaces allow ';
            }
            if(!email1.test(email)) {
                emailErr = 'Email address is not valid';
            }
            if(!pass1.test(password)) {
                passErr = 'password between 8 to 24 characters which contain at least one  uppercase,lowercase'
            }
            res.render('regis', { nameErr: nameErr, passErr: passErr, emailErr: emailErr})
        }
      
    }
  });
});
app.get("/welcome", (req, res) => {
  //let username=req.cookies.username;
  let username = req.session.username;
  if (username) {
    userModel.findOne({ username: username }, (err, data) => {
      if (err) {
        return res.redirect("/login");
      } else {
        return res.render("welcome", {
          username: username,
          path: data.image,
          email: data.email,
          position:data.position,
          id:data.id
        });
      }
    });
  }
  else{
    res.render("login")
  }
});
app.get("/act/:id", (req, res) => {
  let id = req.params.id;

  userModel.findOne({ _id: id }, (err, data) => {
    console.log(data);
    if (err) {
      res.send("something went wrong!!!");
    } else {
      userModel
        .updateOne({ _id: id }, { $set: { status: "1" } })
        .then((data1) => {
          res.render("activate", { username: data.username });
        })
        .catch((err) => {
          res.send("something went wrong");
        });
    }
  });
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  //res.clearCookie("username");
  return res.redirect("/login");
});
app.get("/passwordreset", (req, res) => {
  res.render('reset_mail',{errmsg:'',succmsg:""});
});
app.post('/reset', (req, res) => {
  let { email1 } = req.body;
//   console.log(email1)

  userModel.findOne({ email: email1 }, (err, data) => {
    if (email1 != data.email) {
      res.render('reset_mail',{errmsg:'invalid email id plaese enter registred mail id',succmsg:''})
    }
    else {
      let mailOptions = {
        from: "rishin029@gmail.com",
        to: email1,
        subject: "Testing Mail",
        template: "mail1",
        context: {
          id: data._id,
          email: email1,
        },
      };
      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          console.log(err);
        } else {
          console.log("Mail send : " + id);
        }
      });
      res.render('reset_mail',{errmsg:'',succmsg:"reset password link sent to the mail id "})
    }
    })

})


app.get('/reset_p/:id', (req, res) => {
  let id = req.params.id;
  console.log(id)
  res.render('passwordreset1',{errmsg:"",succmsg:"",id:id});
})
app.post('/reset1', (req, res) => {
  let _id = req.body.id;
  console.log(_id);
  let { password, c_password } = req.body;
  console.log(password, c_password);
  if (password != c_password)
  {
    res.render('passwordreset1',{errmsg:"password is not match plaese enter both filed same",succmsg:''})
    
  }
  else {
     const hash = bcrypt.hashSync(password, saltRounds);
userModel
        .updateOne({ _id:_id }, { $set: { password: hash} })
        .then((data) => {
          res.render("passwordreset1", {errmsg:"",succmsg:"your  password is sucessfully reset"});
        })
        .catch((err) => {
          res.render("passwordrest1",{errmsg:"Plaese enter password not used before",succmsg:""});
        });
  }

  
})
app.listen(PORT, (err) => {
  if (err) throw err;
  else {
    console.log(`Server is working on http://localhost:9999/`);

  }
});