'use strict'

const express = require("express")
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const admin = require("firebase-admin")
// const serviceAccount = require('../landport-3bc55-firebase-adminsdk-bvbwc-75aa56e4d4.json')
const Users = require('../models/users').Users
const Request = require('../models/users').Request
const Riders = require("../models/users").Riders
const jwtSecret = process.env.JWT_SECRET

const router = express.Router()

// admin.initializeApp({
//     credentials: admin.credential.cert(serviceAccount),
//     projectId: "landport-3bc55"
// })


router.get('/:id', async function(req, res, next){
    const userId = req.params.id
    try{
        const user = await Users.findById(userId)
        // console.log(user)
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
    const expoPushToken = req.body.pushToken
    console.log("Expo push token is " + expoPushToken)
    const message = {
        notification: {
            title: "Title of your notification",
            body: "Body of your notification"
        },
        token: expoPushToken
    }

    // admin.messaging().send(message)
    // .then((response) => {
    //     console.log("Succesfully sent message: ", response)
    // })
    // .catch((error) => {
    //     console.log("Error sending message: ", error)
    // })
    console.log("We have hit the register route")
    console.log(jwtSecret)

    bcrypt.hash(password, 10)
    .then(async (hashpassword) => {
        const inputData = {
            name: name,
            email: email,
            password: hashpassword,
            location: location,
            phoneNumber: phoneNumber,
            pushToken: expoPushToken
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

router.put("/update/:uid", async function(req, res, next){
    const userId = req.params.uid
    const name = req.body.name
    const email = req.body.email
    const location = req.body.location
    const phoneNumber = req.body.phoneNumber
    try{
        const user = await Users.findById(userId)
        user.name = name
        user.email = email
        user.location = location
        user.phoneNumber = phoneNumber
        try{
            await user.save()
            res.status(200).json({message: "Successfully updated profile", user: user})
        }
        catch(err){
            next(err)
        }
    }
    catch(error){
        const err = new Error("The customer could not be found")
        err.status = 401
        next(err)
    }
})

router.get("/riders-company/get-companies", async function(req, res, next){
    console.log("the route has been hit")
    await Users.find({role: "rider"})
    .then(riders => {
        // console.log(riders)
        res.status(200).json({message: "Successfully gotten all the riders company ", riders: riders})
    })
    .catch(error => next(error))
})

router.put("/set-location/:rid", async function(req, res, next){
    const riderId = req.params.rid
    const location = req.body.location
    console.log(location)
    try{
        const rider = await Users.findById(riderId)
        rider.mapLocation = JSON.stringify(location)
        try{
            await rider.save()
            res.status(200).json({message: "Succesfully added the location", rider: rider})
        }
        catch(error){
            console.log(error)
        }
    }
    catch(error){
        next(error)
    }
})

router.put("/add-rider/:rid", async function(req, res, next){
    const riderId = req.params.rid
    const plateNumber = req.body.plateNum
    const riderName = req.body.riderName
    const bikeColor = req.body.bikeColor
    const riderPic = req.body.riderPic
    // res.status(201).json({message: "successfully added a new rider"})

    await Riders.create({plateNumber: plateNumber, riderName: riderName, bikeColor: bikeColor, imageUrl: riderPic})
    .then(async (rider) => {
        try{
            const riderCompany = await Users.findById(riderId)
            riderCompany.riders.push(rider)
            const result = await Riders.deleteOne({_id: rider._id})
            console.log(result)
            try{
                await riderCompany.save()
                res.status(201).json({message: "successfully added a new rider", usr: riderCompany})   
            }
            catch(error){
                console.log(error)
            }
        }
        catch(error){
            console.log(error)
        }
    })
    .catch(error => console.log(error))
})

router.put("/update-rider/:uid/:rid", async function(req, res, next){
    const riderId = req.params.rid
    console.log(riderId)
    const userId = req.params.uid
    const plateNumber = req.body.plateNum
    const riderName = req.body.riderName
    const bikeColor = req.body.bikeColor
    const imageUrl = req.body.riderPic

    console.log("the plate number is " + plateNumber)
    // plateNumber, riderName, bikeColor, imageUrl
    // return res.status(200).json({message: "successfully updated rider"})
        try{
            const user = await Users.findById(userId)
            //plateNumber, riderName, bikeColor, imageUrl
            user.riders.id(riderId).plateNumber = plateNumber
            user.riders.id(riderId).riderName = riderName
            user.riders.id(riderId).bikeColor = bikeColor
            user.riders.id(riderId).imageUrl = imageUrl
            await user.save()
            res.status(201).json({message: "successfully updated rider", usr: user})
        }
        catch(error){
            console.log(error)
        }
})

router.delete("/delete-rider/:uid/:rid", async function(req, res, next){
    const riderId = req.params.rid
    const userId = req.params.uid

    await Riders.findOneAndDelete({_id: riderId})
    .then(async (rider) => {
        try{
            await Users.findOneAndUpdate({_id: userId}, {$pull: {riders: {_id: riderId}}})
            const riderCompany = await Users.findById(userId)
            res.status(201).json({message: "successfully deleted rider", usr: riderCompany})
        }
        catch(error){
            console.log(error)
        }
    })
    .catch(error => console.log(error))
})

router.put("/toggle-active/:uid/:rid/", async function(req, res, next){
    const riderId = req.params.rid
    const userId = req.params.uid

    try{
        const riderCompany = await Users.findById(userId)
        riderCompany.riders.id(riderId).available = !riderCompany.riders.id(riderId).available        
        await riderCompany.save()
        res.status(201).json({message: "successfully updated the rider status", usr: riderCompany})   
    }
    catch(error){
        console.log(error)
    }
    
})

module.exports = router