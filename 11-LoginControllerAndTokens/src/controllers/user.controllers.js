import  { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

// generate access token and refresh token method

const generateAccessAndRefreshTokens=async(userId)=>{
    try {
        const user=await User.findById(userId);
        const accessToken=await user.generateAccessToken();
        const refreshToken=await user.generateRefreshToken();

        user.refreshToken=refreshToken; //storing refresh token in database
        await user.save({validateBeforeSave:false}); //not understood

        return {accessToken,refreshToken};
    } 
    catch (error) {
        throw new ApiError(500,"Something went wrong while generating refresh and access token");
    }
}

// controller function

const registerUser=asyncHandler(async(req,res)=>{
    // get user details from frontend
    const {fullName,email,username,password}=req.body;
    // console.log("email:",email);

    // validation - fields not empty
    // if(fullName==="" ){
    //     throw new ApiError(400,"Fullname is required")
    // }
    if([fullName,email,username,password].some((field)=>field?.trim()==="")){
        throw new ApiError(400,"All fields are required");
    }

    // check if user already exists - check using username or email
    const existedUser=await User.findOne({
        $or: [ {username} , {email} ]
    });
    if(existedUser){
        throw new ApiError(409,"User with same email or username already exists!");
    }

    // check for images, check for avtar
    // console.log(req.files);
    const avatarLocalPath=req.files?.avatar[0]?.path;
    // const coverImageLocalPath=req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
        coverImageLocalPath=req.files.coverImage[0].path;
    }

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar path is required");
    }

    // upload them to cloudinary, avtar
    const avatar=await uploadOnCloudinary(avatarLocalPath);
    const coverImage=await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(400,"Avatar file is required");
    }

    // create user object - create entry in db
    const user=await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase(),
    });

    // remove password and refresh token field from response
    const createdUser=await User.findById(user._id).select("-password -refreshToken");

    // check for user creation
    if(!createdUser){
        throw new ApiError(500,"Something went wrong");
    }

    // return res
    return res.status(200).json(
        new ApiResponse(200,createdUser,"User registered Successfully"),
    );
});

const loginUser=asyncHandler(async(req,res)=>{
    // req body->data
    const { email, username, password } = req.body;

    // username and email
    if(!username && !email){
        throw new ApiError(400,"username or email is required"); //
    }

    // find the user based on their username or email
    const user=await User.findOne({
        $or: [ {username} , {email} ]
    });

    if(!user){
        throw new ApiError(404,"User does not exists");
    }

    // password check
    const isPasswordValid=await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new ApiError(401,"Invalid user credentials");
    }

    // access and refresh tokens
    const {accessToken,refreshToken}=await generateAccessAndRefreshTokens(user._id); //
    const loggedInUser=await User.findById(user._id).select("-password -refreshToken");

    // send cookie 
    // cookie is modifiable by server only (restriction)
    const options={
        httpOnly:true,
        secure:true,
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(new ApiResponse(200,{user:loggedInUser,accessToken,refreshToken},"User Logged In Successfully"));
});

const logoutUser=asyncHandler(async(req,res)=>{
    
    await User.findByIdAndUpdate(
        req.user._id,
        { $set:{ refreshToken: undefined } },
        { new:true },
    );

    const options={
        httpOnly:true,
        secure:true,
    }

    // clear cookies
    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User Logged out"));
});

const refreshAccessToken=asyncHandler(async(req,res)=>{
    const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken;

    if(!incomingRefreshToken){
        throw new ApiError(401,"Unauthorized Request"); 
    }

    try {
        const decodedToken=jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET);
        
        const user=await User.findById(decodedToken?._id);
    
        if(!user){
            throw new ApiError(401,"Invalid Refresh Token");
        }
    
        if(incomingRefreshToken!==user?.refreshToken){
            throw new ApiError(401,"Refresh token is expired or used");
        }
    
        const options={
            httpOnly:true,
            secure:true,
        }
    
        const {accessToken,newRefreshToken}=await generateAccessAndRefreshTokens(user._id);
    
        return res
        .status(200)
        .cookie("accessToken",accessToken)
        .cookie("refreshToken",newRefreshToken)
        .json(  
            new ApiResponse(200,{accessToken,refreshToken:newRefreshToken},"Access Token refreshed successfully")
        );
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid refresh token");
    }
});

export {registerUser,loginUser,logoutUser,refreshAccessToken};