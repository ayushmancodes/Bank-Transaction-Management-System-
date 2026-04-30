const userModel = require('../models/user.model');
const jwt = require('jsonwebtoken')
const emailService = require('../services/email.service')

const userRegisterController = async (req, res) => {
    try {
        const {email, password, name} = req.body;
        
        const doesExist = await userModel.findOne({email});
        if(doesExist){
            return res.status(422).json({
                message : "User already exists with this email",
                status : "failed"
            })
        }

        const user = await userModel.create({
            email, name, password
        })

        const token = jwt.sign({
            userId : user._id,
        }, process.env.JWT_SECRET) 

        res.cookie("token", token)

        return res.status(201).json({
            user : {
                id : user._id,
                email : email,
                name : name
            },
            token
        })


    } catch (error) {
        console.error("Registration error : ", error);
        return res.status(500).json({
            message : "Internal server error",
            status : "error"
        })
    }
}

const userLoginController = async (req, res) => {
    try {
        const {email, password} = req.body;

        const user = await userModel.findOne({email}).select('+password');
        if(!user){
            return res.status(401).json({
                message : 'Email or password is invalid'
            })
        }
        
        const isPasswordValid = await user.comparePassword(password);
        
        if(!isPasswordValid){
            return res.status(401).json({
                message : 'Email or password is invalid'
            }) 
        }

        const token = jwt.sign({
            userId : user._id,
        }, process.env.JWT_SECRET) 

        res.cookie("token", token)

        return res.status(200).json({
            message : "Login successfull",
            user : {
                id : user._id,
                email : email,
                name : user.name
            },
            token
        })    
    } catch (error) {
        console.error("Login error : ", error);
        return res.status(500).json({
            message : "Internal server error",
            status : "error"
        })
    }
}

const userLogoutController = async (req, res) => {
    try {
        res.clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: 'strict'
        });
        return res.status(200).json({
            message: "Logged out successfully",
            status: "success"
        });
    } catch (error) {
        console.error("Logout error:", error);
        return res.status(500).json({
            message: "Internal server error during logout"
        });
    }
}

module.exports = {userRegisterController, userLoginController, userLogoutController}