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

const calculateDistance = (userCoords, recvCoords) => {
    const toRadian = n => (n * Math.PI) / 180
    const R = 6371
    const lat2 = recvCoords.latitude
    const lon2 = recvCoords.longitude
    const lat1 = userCoords.latitude
    const lon1 = userCoords.longitude
    const x1 = lat2 - lat1
    const dLat = toRadian(x1)
    const x2 = lon2 - lon1
    const dLon = toRadian(x2)
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRadian(lat1)) * Math.cos(toRadian(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const d = R * c
    return d
}

router.post("/:uid/make-request", async function(req, res, next){
    console.log("We hit the make request endpoint")
    const senderName = req.body.senderName
    const senderLocation = req.body.senderLocation
    const senderPhoneNumber = req.body.senderPhoneNumber

    const receiverName = req.body.receiverName
    const receiverLocation = req.body.receiverLocation
    const receiverPhoneNumber = req.body.receiverPhoneNumber

    const productName = req.body.productName
    const productQuantity = req.body.productQuantity
    const productImage = req.body.productImage

    console.log(receiverLocation)
    console.log(senderLocation)

    // console.log(calculateDistance(senderLocation, receiverLocation))

    // console.log(senderName)
    // console.log(senderLocation)
    // console.log(senderPhoneNumber)
    // console.log(receiverName)
    // console.log(receiverLocation)
    // console.log(receiverPhoneNumber)

    const userId = req.params.uid

    await TransPerson.create({
        category: "sender",
        name: senderName,
        location: {latitude: senderLocation.latitude, longitude: senderLocation.longitude},
        phoneNumber: senderPhoneNumber
    })
    .then(async (senderObj) => {
        await TransPerson.create({
            category: "receiver",
            name: receiverName,
            location: {latitude: receiverLocation.latitude, longitude: receiverLocation.longitude},
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

    // console.log(senderName)
    // console.log("The request is ...")
    // console.log(request.recipient.location)
    // console.log(request.sender.location)
    const distance = calculateDistance(request.sender.location, request.recipient.location)
    const cost = distance * 500
    const transCost = Number((cost / 10).toPrecision(3) + "0")
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
                    transactionCost: transCost,
                    distance: distance,
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

router.put("/:uid/cust-confirm/:tid", async function(req, res, next){
    const userId = req.params.uid
    const transId = req.params.tid
    try{
        const transaction = await Transactions.findById(transId)
        transaction.customerConfirm = true
        // console.log(transaction)
        try {
            await transaction.save()
            await Users.find({})
            .then( async (users) => {
                for (let i=0; i<users.length; i++){
                    users[i].transactions.id(transId).customerConfirm = true
                    try {
                        await users[i].save()
                        console.log("where is the error comming from") 
                    } catch (error) {
                        next(error)
                    }
                }
                res.status(200).json({message: "Transaction successfully confirmed", transaction: transaction})
            })
        } catch (error) {
            next(error)
        }
    }
    catch(error){
        next(error)
    }
})

router.delete("/:uid/delete-transaction/:tid", async function(req, res, next){
    console.log("This route has been hit")
    const userId = req.params.uid
    const transId = req.params.tid
    try {
        await Users.findOneAndUpdate({_id: userId}, {$pull: {transactions: {_id: transId}}})
        res.status(200).json({message: "Transaction successfully Removed"})
    } catch (error) {
        next(error)
    }
})

module.exports = router