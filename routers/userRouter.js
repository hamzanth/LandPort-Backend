'use strict'

const express = require("express")
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const Users = require('../models/users').Users
const Request = require('../models/users').Request
const jwtSecret = process.env.JWT_SECRET

const router = express.Router()

router.get('/:id', async function(req, res, next){
    const userId = req.params.id
    try{
        const user = await Users.findById(userId)
        res.status(200).json({message: "Successfully retrieved user", user: user})
    }
    catch(error){
        const err = new Error("The customer could not be found")
        err.status = 401
        next(err)
    }
})

router.post("/register", function(req, res, next){
    const name = req.body.name
    const email = req.body.email
    const password = req.body.password
    const location = req.body.location
    const phoneNumber = req.body.phoneNumber


    bcrypt.hash(password, 10)
    .then(async (hashpassword) => {
        const inputData = {
            name: name,
            email: email,
            password: hashpassword,
            location: location,
            phoneNumber: phoneNumber
        }
        await Users.create(inputData)
        .then(user => {
            const maxAge = 3 * 60 * 60
            const token =  jwt.sign({id: user._id, role: user.role}, jwtSecret, {expiresIn: maxAge})
            res.status(201).json({message: "Successfully Created", token: token, user: user})
        })
        .catch(error => {
            next(error)
        })
    })
    .catch(err => {
        next(err)
    })
})

router.post("/login", async function(req, res, next){
    const name = req.body.name
    const password = req.body.password
    try{
        const user = await Users.findOne({name: name})
        bcrypt.compare(password, user.password)
        .then(result => {
            if(!result){
                const error = new Error("Login Not Successful")
                error.status = 400
                next(error)
            }
            else{
                const maxAge = 3 * 60 * 60
                const token = jwt.sign(
                    {id: user._id, role: user.role},
                    jwtSecret,
                    {expiresIn: maxAge}
                )
                res.status(200).json({message: "Customer Successfully Logged in", token: token, user: user})
            }
        })
        .catch(err => {
            next(err)
        })
    }
    catch(error){
        try{
            const lmis = await Lmis.findOne({name: name})
            if (lmis){
                res.status(200).json({message: "Successfully Logged in ", lmis: lmis})
            }
            else{
                const err = new Error("Login Not Successful")
                err.status = 400
                next(err)
            }
        }
        catch(erro){
            // next(err)
            const err = new Error("Login Not Successful")
            err.status = 400
            next(err)
        }
    }
})

router.get("/riders-company/get-companies", async function(req, res, next){
    console.log("the route has been hit")
    await Users.find({role: "rider"})
    .then(riders => {
        console.log(riders)
        res.status(200).json({message: "Successfully gotten all the riders company ", riders: riders})
    })
    .catch(error => next(error))
})

module.exports = router