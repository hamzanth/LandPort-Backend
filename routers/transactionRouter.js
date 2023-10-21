const express = require('express')
const router = express.Router()
const Transactions = require('../models/users').Transactions
const Users = require('../models/users').Users
const Request = require('../models/users').Request
const TransPerson = require('../models/users').TransPerson
const Products = require('../models/products').Products

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
                        const user = await Users.findById(customerId)
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

module.exports = router