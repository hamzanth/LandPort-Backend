'use strict';

const express = require('express')
const dotenv = require('dotenv')
dotenv.config()
const logger = require('morgan')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const userRouter = require('./routers/userRouter')
const transRouter = require('./routers/transactionRouter')
const admin = require("firebase-admin")
// const serviceAccount = require('./landport-3bc55-firebase-adminsdk-bvbwc-75aa56e4d4.json')
const app = express()
app.use(logger("dev"))
app.use(bodyParser.json())

mongoose.connect(process.env.MONGO_URI)
const db = mongoose.connection
db.on("error", function(err){
    console.log(err)
})

app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods","OPTIONS, GET, POST, PUT, PATCH, DELETE")
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization")
    if (req.method === "OPTIONS"){
        return res.sendStatus(200)
    }
    next()
})

app.use('/users', userRouter)
app.use('/transactions', transRouter)

app.use(function(req, res, next){
    const error = new Error("Page Does Not Exist")
    error.status = 404
    next(error)
})

app.use(function(err, req, res, next){
    res.status(err.status || 500)
    res.json({
        error: {message: err.message}
    })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, function(){
    console.log("Server is Listening")
})