const express = require('express')
const router = express.Router()
const crypto = require('crypto')
const Transactions = require('../models/users').Transactions
const Linker = require('../models/users').Linker
const Users = require('../models/users').Users
const Request = require('../models/users').Request
const TransPerson = require('../models/users').TransPerson
const Products = require('../models/products').Products

router.get("/requests", async function(req, res, next){
    await Request.find({})
    .then(requests => {
        res.status(200).json({message: "Successfully gotten all the requests ", requests: requests})

    })
    .catch(error => next(error))
})

router.get("/unapproved-requests", async function(req, res, next){
    await Request.find({approved: false})
    .then(requests => {
        res.status(200).json({message: "Successfully gotten all the requests ", requests: requests})
    })
    .catch(error => next(error))
})

router.post("/:uid/make-request", async function(req, res, next){
    const senderName = req.body.senderName
    const senderLocation = req.body.senderLocation
    const senderPhoneNumber = req.body.senderPhoneNumber

    const receiverName = req.body.receiverName
    const receiverLocation = req.body.receiverLocation
    const receiverPhoneNumber = req.body.receiverPhoneNumber

    const productName = req.body.productName
    const productQuantity = req.body.productQuantity
    const productImage = req.body.productImage

    const userId = req.params.uid

    await TransPerson.create({
        category: "sender",
        name: senderName,
        location: senderLocation,
        phoneNumber: senderPhoneNumber
    })
    .then(async (senderObj) => {
        await TransPerson.create({
            category: "receiver",
            name: receiverName,
            location: receiverLocation,
            phoneNumber: receiverPhoneNumber
        })
        .then(async (receiverObj) => {
            await Products.create({
                name: productName,
                quantity: productQuantity,
                image: productImage
            })
            .then(async (productObj) => {
                await Request.create({
                    sender: senderObj,
                    recipient: receiverObj,
                    product: productObj
                })
                .then( async (requestObj) => {
                    try{
                        const user = await Users.findById(userId)
                        user.requests.push(requestObj)
                        await user.save()
                        res.status(201).json({message: "Request Successfully Sent. Wait a moment for response", request: requestObj})
    
                    }
                    catch(error){
                        next(error)
                    }
                })
                .catch(error => {
                    next(error)
                })
            })
            .catch(error => next(error))
        })
        .catch(error => next(error))        
    })
    .catch(error => {
        next(error)
    })
})

router.post("/create-transaction", async function(req, res, next){
    const senderName = req.body.senderName
    const request = req.body.request
    const rider = req.body.rider

    console.log(senderName)
    console.log("The request is ...")
    console.log(request)
    // console.log(request)
    // console.log(rider)
    try{
        const user = await Users.findOne({name: senderName})
        // console.log(user)
        await Linker.create({
            name: user.name,
            category: user.role,
            location: user.location,
            phoneNumber: user.phoneNumber
        })
        .then(async (customerLinker) => {
            await Linker.create({
                name: rider.name,
                category: rider.role,
                location: rider.location,
                phoneNumber: rider.phoneNumber
            })
            .then(async (riderCompanyLinker) => {
                const refNumber = crypto.randomBytes(8).toString("hex")
                await Transactions.create({
                    refNumber: refNumber,
                    transactionCost: 500,
                    request: request,
                    customer: customerLinker,
                    riderCompany: riderCompanyLinker
                })
                .then(async (transaction) => {
                    user.transactions.push(transaction)
                    try{
                        await user.save()
                        const ridersCompany = await Users.findById(rider._id)
                        ridersCompany.transactions.push(transaction)
                        try{
                            await ridersCompany.save()
                            await Users.find({role: "lmis"})
                            .then(async (lmis) => {
                                for(let i=0; i<lmis.length; i++){
                                    lmis[i].transactions.push(transaction)
                                    try{
                                        await lmis[i].save()
                                    }
                                    catch(error){
                                        next(error)
                                    }
                                }
                                const requestObj = await Request.findById(request._id)
                                requestObj.approved = true
                                console.log(requestObj)
                                try{
                                    await requestObj.save()
                                    res.status(201).json({message: "Transaction Successfully Created", transaction: transaction})
                                }
                                catch(error){
                                    next(error)
                                }
                            })
                            .catch(error => next(error))
                        }
                        catch(error){
                            next(error)
                        }
                    }
                    catch(error){
                        next(error)
                    }
                })
                .catch(error => next(error))
            })
            .catch(error => next(error))
        })
        .catch(error => next(error))
    }
    catch(error){
        next(error)
    }
})

module.exports = router