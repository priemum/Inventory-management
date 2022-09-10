require("dotenv").config()
const express= require("express");
const bodyParser=require("body-parser")
const mongoose=require("mongoose");
const bcrypt=require("bcrypt");
const nodemailer=require("nodemailer");
const jwt=require("jsonwebtoken");
const cookieParser=require("cookie-parser");
const app=express();


app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.use(cookieParser());

const transporter = nodemailer.createTransport({
    service:"gmail",
    auth:{
        user:"emailtushar1910@gmail.com",
        pass:process.env.PASSWORD
    },
    port: 465,
    host:"smtp.gmail.com"
})

const mongoURI=process.env.MONGO_URL;

mongoose.connect(mongoURI,{
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(()=>{
  console.log("Successfully connected to database");
}).catch((e)=>{
  console.log(e);
})


const isAuth=async (req,res,next)=>{
    
    if(await req.cookies.jwt===undefined){
        res.redirect("/");
    }
    else{
        const token=await req.cookies.jwt;
        try{
            await jwt.verify(token,process.env.SECRET_KEY);
            next();
        }catch(e){
            console.log(e);
            res.redirect("/");
        }
        

    }
}

const userSchema= new mongoose.Schema({
    username: String,
    name: String,
    email: String,
    password: String
  });
  


const User= mongoose.model("User",userSchema);


const productSchema= new mongoose.Schema({
    name: String,
    url: String,
    price: Number,
    quantity: Number
})

const collectionSchema= new mongoose.Schema({
    name: String,
    url: String,
    products: [productSchema]
  });
  
const Item= mongoose.model("Item",collectionSchema);

let foundLogin=1;
let message="";

let foundLoginSignup=1;
let messageSignup="";

let foundLoginForgot=1;
let messageForgot="";

let foundLoginChange=1;
let messageChange="";

let foundLoginCollection=1;
let messageCollection="";

let foundLoginProduct=1;
let messageProduct="";

app.get("/",(req,res)=>{
    res.render("Login",{found: foundLogin,alertMessage: message});
    foundLogin=1;
    message="";
})

app.get("/Logout",isAuth,(req,res)=>{
    res.clearCookie("jwt");
    res.render("success",{successMessage: "You are successfully Logged Out."});
})

app.post("/Logout",(req,res)=>{
    res.redirect("/");
})

app.post("/",(req,res)=>{
    const Email= req.body.email;
    const Password= req.body.password;
    User.findOne({email: Email}).then(async (foundUser)=>{
      if(!foundUser){
        foundLogin=0;
        message="Email is not registered";
        res.redirect("/");
      }
      else{
        const isMatch=await bcrypt.compare(Password,foundUser.password);
        const Name= foundUser.username
        if(isMatch){
            const token=await jwt.sign({
                Name
            },process.env.SECRET_KEY)
            res.cookie("jwt",token,{
                expires: new Date(Date.now()+ 24*60*60*1000),
                httpOnly: true
            })
            res.redirect(`/${foundUser.username}/collection`)       
         }
        else{
          foundLogin=0;
          message="Password is incorrect";
          res.redirect("/");
        }
      }
    }).catch((e)=>{
      console.log(e);
    })
  })

app.get("/forgot",(req,res)=>{
    res.render("Forgot",{found: foundLoginForgot,alertMessage: messageForgot});
    foundLoginForgot=1;
    messageForgot="";
})

app.post("/forgot",(req,res)=>{
    const Email= req.body.email;
    User.findOne({email: Email}).then((foundUser)=>{
      if(!foundUser){
        foundLoginForgot=0;
        messageForgot="Email is not registered";
        res.redirect("/forgot");
      }
      else{
        const mailOptions={
            from:"emailtushar1910@gmail.com",
            to:Email,
            subject:"Recover Password",
            text:`Password of your Inventory Account: ${foundUser.password}`
        }
        transporter.sendMail(mailOptions).then(()=>{
            res.render("success",{successMessage: "Password has been send to you Email."})
        }).catch((e)=>{
            console.log(e);
        })
      }
    }).catch((e)=>{
      console.log(e);
    })
  })

app.post("/change",(req,res)=>{
    const Email= req.body.email;
    const oldPassword= req.body.oldPassword;
    const newPassword= req.body.newPassword;
    User.findOne({email: Email}).then(async (foundUser)=>{
      if(!foundUser){
        foundLoginChange=0;
        messageChange="Email is not registered";
        res.redirect("/change");
      }
      else{
        const isMatch=await bcrypt.compare(oldPassword,foundUser.password);
        if(isMatch){
            if(oldPassword === newPassword){
                foundLoginChange=0;
                messageChange="Old Password and New Password must be different";
                res.redirect("/change");
            }
            else{
                if(newPassword.length > 7){
                    const Password=await bcrypt.hash(newPassword,12);
                    User.findOneAndUpdate({email: Email},{$set: {password: Password}}).then(()=>{
                        res.render("success",{successMessage: "Password has been changed."})
                    }).catch((e)=>{
                        console.log(e);
                    })
                }
                else{
                    foundLoginChange=0;
                    messageChange="New Password must be 8 character long";
                    res.redirect("/change");
                }
            }
            
        }
        else{
            foundLoginChange=0;
            messageChange="Old Password is incorrect";
            res.redirect("/change");
        }
      }
    }).catch((e)=>{
      console.log(e);
    })
  })

app.get("/change",(req,res)=>{
    res.render("changePassword",{found: foundLoginChange,alertMessage: messageChange});
    foundLoginChange=1;
    messageChange="";
})

app.get("/:username/collection",isAuth,(req,res)=>{
    const username= req.params.username;
       User.findOne({username: username}).then((found)=>{
            if(found){
                Item.find().then((foundItem)=>{
                    res.render("collection",{userName: username, Items: foundItem});
                }).catch((e)=>{
                    console.log(e)
                })
            }
        }).catch((e)=>{
            console.log(e)
        })

})

app.get("/signup",(req,res)=>{
    res.render("Signup",{found: foundLoginSignup,alertMessage: messageSignup});
    foundLoginSignup=1;
    messageSignup="";
})

app.post("/success",(req,res)=>{
    res.redirect("/");
})

app.post("/signup", (req,res)=>{
    User.findOne({username: req.body.Uname}).then((foundUser)=>{
      if(!foundUser){
        User.findOne({email: req.body.email}).then(async (foundemail)=>{
        if(!foundemail){
            if(req.body.password.length>7){
            const Password= await bcrypt.hash(req.body.password,10);
            const Uname=req.body.Uname
            const user= new User({
                username: Uname,
                name: req.body.name,
                email: req.body.email,
                password: Password
            })
            user.save().then(async ()=>{
                const token=await jwt.sign({
                    Uname
                },process.env.SECRET_KEY)
                res.cookie("jwt",token,{
                    expires: new Date(Date.now()+ 24*60*60*1000),
                    httpOnly: true
                })
                res.redirect(`/${req.body.Uname}/collection`)       
            }).catch((e)=>{
               
                console.log(e);
                res.redirect("/signup"); 
            })
        }
        else{
            foundLoginSignup=0;
            messageSignup="Password must be 8 character long";
            res.redirect("/signup"); 
        }
    }
        else{
            foundLoginSignup=0;
            messageSignup="Email has been already registered";
            res.redirect("/signup"); 
        }
     
      });
    }
    else{
        foundLoginSignup=0;
        messageSignup="Username is not available";
        res.redirect("/signup");
    }
    })
})

  
app.get("/:username/update-profile",isAuth,(req,res)=>{
    User.findOne({username: req.params.username}).then((found)=>{
        res.render("updateProfile",{userName: found.username, name: found.name , Email: found.email})
    })
})

app.get("/:username/profile",isAuth,(req,res)=>{
    User.findOne({username: req.params.username}).then((found)=>{
        res.render("Profile",{userName: found.username, name: found.name , Email: found.email})
    })
})

app.post("/:username/update-profile",(req,res)=>{
    User.findOne({email: req.body.email}).then((found)=>{
        if(!found){
            User.findOneAndUpdate({username: req.params.username},{$set: {name: req.body.name,email: req.body.email}}).then(()=>{
                res.redirect(`/${req.params.username}/collection`);
            }).catch((e)=>{
                console.log(e);
            })
        }
        else{
            if(found.email === req.body.email){
             User.findOneAndUpdate({username: req.params.username},{$set: {name: req.body.name}}).then(()=>{
                res.redirect(`/${req.params.username}/collection`);
            }).catch((e)=>{
                console.log(e);
            })
         }
        }
    })
})

app.get("/:username/create-collection",isAuth,(req,res)=>{
    const username= req.params.username
    res.render("createCollection",{userName: username,found:foundLoginCollection,alertMessage:messageCollection});
    foundLoginCollection=1;
    messageCollection="";
})

app.post("/:username/create-collection",(req,res)=>{
   Item.findOne({name: req.body.cname}).then((found)=>{
     if(!found){
        const item= new Item({
            name: req.body.cname,
            url: req.body.url,
            products: []
        })
        item.save();
        res.redirect(`/${req.params.username}/collection`);
     }
     else{
        foundLoginCollection=0;
        messageCollection="Collection of this name is already exist";
        res.redirect(`/${req.params.username}/create-collection`);
     }
   }).catch((e)=>{
    console.log(e);
   })
})

app.get("/:username/create-product",isAuth,(req,res)=>{
    const username= req.params.username
    res.render("createProduct",{userName: username,found:foundLoginProduct,alertMessage:messageProduct});
    foundLoginProduct=1;
    messageProduct="";
})

app.post("/:username/create-product",(req,res)=>{
    Item.findOne({name: req.body.cname}).then((found)=>{
        if(!found){
            foundLoginProduct=0;
            messageProduct="Collection does not exist";
            res.redirect(`/${req.params.username}/create-product`);
        }
        else{
            let count=0;
            found.products.forEach(Element =>{
                if(Element.name === req.body.pname){
                    count=1;
                }
            })
            if(count === 0){
                const product= {
                    name: req.body.pname,
                    url: req.body.url,
                    price: req.body.price,
                    quantity: req.body.quantity
                }
                found.products.push(product);
                found.save();
                res.redirect(`/${req.params.username}/collection`);
            }
            else{
                foundLoginProduct=0;
                messageProduct="Product of this name is already exist";
                res.redirect(`/${req.params.username}/create-product`);
            }
        }
      }).catch((e)=>{
       console.log(e);
      })
})

app.get("/:username/:collection/delete",isAuth,(req,res)=>{
    Item.findOneAndRemove({name: req.params.collection}).then(()=>{
        res.redirect(`/${req.params.username}/collection`);
    }).catch((e)=>{
        console.log(e);
    });
})

app.get("/:username/:collection/product",isAuth,(req,res)=>{
    Item.findOne({name: req.params.collection}).then((found)=>{
        const username= req.params.username;
        res.render("Products",{userName: username, Items: found.products,collection: req.params.collection});
    }).catch((e)=>{
        console.log(e);
    })
})

app.get("/:username/:collection/:product/delete",isAuth,(req,res)=>{
    Item.findOneAndUpdate({name: req.params.collection},{$pull: {products: {name: req.params.product}}}).then(()=>{
        res.redirect(`/${req.params.username}/${req.params.collection}/product`);
    }).catch((e)=>{
        console.log(e);
    });
})

app.get("/:username/:collection/update-collection",isAuth,(req,res)=>{
    Item.findOne({name: req.params.collection}).then((found)=>{
        res.render("updateCollections",{userName: req.params.username,collectionName: found.name,collectionUrl: found.url});
    }).catch((e)=>{
        console.log(e);
    })
})

app.post("/:username/:collection/update-collection",(req,res)=>{
    Item.findOneAndUpdate({name: req.params.collection},{$set: {url: req.body.url}}).then((found)=>{
        res.redirect(`/${req.params.username}/collection`);
    }).catch((e)=>{
        console.log(e);
    })
})

app.get("/:username/:collection/:product/update",isAuth,(req,res)=>{
    Item.findOne({name: req.params.collection}).then((found)=>{
        found.products.forEach(element=>{
            if(element.name===req.params.product){
             res.render("updateProduct",{userName: req.params.username,productName: element.name,Url: element.url,price:element.price, quantity: element.quantity, collection: req.params.collection});
            }
        })
    }).catch((e)=>{
        console.log(e);
    })
})

app.post("/:username/:collection/:product/update",(req,res)=>{
    Item.findOneAndUpdate({name: req.params.collection},{$pull: {products: {name: req.params.product}}}).then((found)=>{
        const product= {
            name: req.body.pname,
            url: req.body.url,
            price: req.body.price,
            quantity: req.body.quantity
        }
        found.products.push(product);
        found.save().then(()=>{
            res.redirect(`/${req.params.username}/collection`);
        });
    }).catch((e)=>{
        console.log(e);
    });
})

app.listen(process.env.PORT || 3000,()=>{
    console.log("Server has started");
})








