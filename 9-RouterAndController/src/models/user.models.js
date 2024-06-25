import mongoose from "mongoose"
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

const userSchema=new mongoose.Schema({
    username:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
        index:true,
    },
    fullName:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
        index:true,
    },
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
    },
    avatar:{
        type:String, //cloudinary URL
        required:true,
    },
    coverImage:{
        type:String,
    },
    watchHistory:[
        {
            types:mongoose.Schema.Types.ObjectId,
            ref:"Video",
        }
    ],
    password:{
        type:String,
        required:[true,"Password is required"],
    },
    refreshToken:{
        type:String,
    },
},
{timestamps:true});

// pre hook or middleware
// note - don't use arrow function here
userSchema.pre("save",async function(next){

    //encrypt password only when it is set or modified
    if(!this.isModified("password")) return next(); 

    this.password=bcrypt.hash(this.password,10);
    next();
});

userSchema.methods.isPasswordCorrect=async function(password){
    return await bcrypt.compare(password,this.password);
}

userSchema.methods.generateAccessToken=function(){
    return jwt.sign({
        _id:this._id,
        username:this.username,
        email:this.email,
        fullName:this.fullName,
    }, 
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn:process.env.ACCESS_TOKEN_EXPIRY }
    );
}

userSchema.methods.generateRefreshToken=function(){
    return jwt.sign({
        _id:this._id,
    }, 
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn:process.env.REFRESH_TOKEN_EXPIRY }
    );
}

export const User=mongoose.model("User",userSchema);
