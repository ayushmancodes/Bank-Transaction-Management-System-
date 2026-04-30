const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const validator = require('validator');

const userSchema = new mongoose.Schema({
    email : {
        type : String, 
        required : [true, "Email is required to create an account"],
        trim : true,
        lowercase : true,
        validate : {
            validator : validator.isEmail,
            message : "please provide with a valid email"
        }
    },
    name : {
        type : String, 
        required : [true, "Name is required to create an account"],
        trim : true,  
    },
    password : {
        type : String, 
        required : [true, "Password is required to create an account"],
        minLength : [6, "Password must be at least 6 characters long"],
        select : false
    },
    systemUser : {
        type : Boolean, 
        default : false,
        immutable : true,
        select : false
    }
}, {
    timestamps : true
})

userSchema.pre("save", async function(next){
    if(!this.isModified("password")) return next();

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(this.password, salt);
    this.password = hashedPassword;
})

userSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
}

const userModel = mongoose.model("user", userSchema);

module.exports = userModel  