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

router.get("/completed-transactions", async function(req, res, next){
    await Transactions.find({customerConfirm: true, riderConfirm: true})
    .then(transactions => {
        res.status(200).json({message: "Successfully gotten all the requests ", transactions: transactions})
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

const getAvailRider = (rider) => {
    for (let i=0; i<rider.riders.length; i++){
        if(rider.riders[i].available === true){
            return true
        }
    }
    return false
}

router.post("/:uid/make-request", async function(req, res, next){
        console.log("We hit the make request endpoint")
        const userId = req.params.uid
        let distList = []

        const senderName = req.body.senderName
        const senderLocation = req.body.senderLocation
        const senderPhoneNumber = req.body.senderPhoneNumber

        const recieverDetails = req.body.recieverDetails

        const productName = req.body.productName
        const productQuantity = req.body.productQuantity
        const productImage = req.body.productImage

        console.log(recieverDetails)
        // console.log(senderLocation)
        let notEnough = false
        let riderLeft = 0
        // return res.status(200).json({message: "successfull made the request"})
        reqArray = []
        for (let i=0; i<recieverDetails.length; i++){
            try{
                // const user = await Users.findById(userId)
                await Users.find({role: "rider"})
                .then(async (riders) => {
                    for (let j=0; j<riders.length; j++){
                        // console.log(getAvailRider(riders[j]))
                        if (getAvailRider(riders[j])){
                            // console.log(riders[j].name)
                            // console.log(riders[j].riders)
                            let riderLoc = JSON.parse(riders[j].mapLocation)
                            // console.log(riderLoc)
                            let dist = calculateDistance(senderLocation, riderLoc)
                            let distObj = {}
                            distObj["rider"] = riders[j]
                            distObj["distance"] = dist
                            distList.push(distObj)
                        }
                    }
                    // console.log(distList)
                    // if ((distance.length === 0) && (notEnough == true)){

                    // }
                    if (distList.length === 0){
                        notEnough = true
                        if (riderLeft === 0){
                            riderLeft = recieverDetails.length - i
                        }
                        return
                        // return res.status(200).json({message: `Not Enough dispatch riders, ${recieverDetails.length - i} left undispatched`})
                    }
                    const sortedList = distList.sort((a, b) => {
                        return a.distance - b.distance
                    })
                    // console.log("The sorted list is")
                    // console.log(sortedList)
                    // console.log(closestRider)
                    distList = []
                    if (!sortedList[0]){
                        console.log("Transaction not successful ")
                        res.status(201).json({message: "Transaction Not Successfully Created"})
                    }
                    else{
                        console.log("We are here")
                        // console.log(sortedList[0].rider.riders)
                        const urider = sortedList[0].rider.riders.find((value, index, arr) => value.available === true)
                        // console.log(urider)
                        urider.available = false
                        // console.log(urider)
                        // console.log(sortedList[0].rider.riders.id(urider._id))
                        // sortedList[0].rider.riders.id(urider._id).available = urider.available
                        // await sortedList[0].rider.save()
                        // return res.status(200).json({message: "this is a message"})
                        await Users.findOneAndUpdate({_id: sortedList[0].rider._id, "riders._id": urider._id}, {$set: {"riders.$.available": false}})
                        .then(async (rider) => {
                            await TransPerson.create({
                                category: "sender",
                                name: senderName,
                                location: {latitude: senderLocation.latitude, longitude: senderLocation.longitude},
                                phoneNumber: senderPhoneNumber
                            })
                            .then(async (senderObj) => {
                                await TransPerson.create({
                                    category: "receiver",
                                    name: recieverDetails[i].recieverName,
                                    location: {latitude: recieverDetails[i].location.latitude, longitude: recieverDetails[i].location.longitude},
                                    phoneNumber: recieverDetails[i].recieverPhoneNumber
                                })
                                .then(async (recieverObj) => {
                                    await Products.create({
                                        name: productName,
                                        quantity: productQuantity,
                                        image: productImage
                                    })
                                    .then(async (productObj) => {
                                        const sendDist = calculateDistance(senderLocation, recieverDetails[i].location)
                                        const cost = sendDist * 500
                                        const transCost = Number((cost / 10).toPrecision(3) + "0")
                                        await Request.create({
                                            sender: senderObj,
                                            recipient: recieverObj,
                                            product: productObj,
                                            rider: urider,
                                            riderCompany: sortedList[0].rider,
                                            distance: sendDist,
                                            transactionCost: transCost
                                        })
                                        .then(async (requestObj) => {
                                            reqArray.push(requestObj)
                                            const riderComp = sortedList[0].rider
                                            riderComp.requests.push(requestObj)
                                            try{
                                                await riderComp.save()
                                            }
                                            catch(error){
                                                console.log(error)
                                            }
                                        })
                                    })
                                    .catch(error => console.log(error))
                                })
                                .catch(error => console.log(error))
                            })
                            .catch(error => console.log(error))
                            })
                        .catch(error => console.log(error))
                        // res.status(200).json({message: "Successfully made the request"})
                    }
                })
            }
            catch(error){
                console.log(error)
            }
        }
        // console.log("the length of the array is " + reqArray.length)

        // console.log(`riderLeft is ${riderLeft} and recieverDetail is ${recieverDetails.length}`)
        if (riderLeft === recieverDetails.length){
            return res.status(200).json({message: `No Available dispatch riders at the moment`})
        }
        // return res.status(200).json({message: `No Available dispatch riders at the moment`})

        try{
            console.log("this is before the user push")
            const user = await Users.findById(userId)
            // user..push(reqArray)
            // await user.save()
            console.log("after the user push and save")
            // res.status(201).json({message: "Request Successfully Sent. Wait a moment for response", request: requestObj})
            // MODIFICATION START
            // const closestRider = await getClosestRider(req)

            
            // const distance = calculateDistance(requestObj.sender.location, requestObj.recipient.location)
            // const cost = distance * 500
            // const transCost = Number((cost / 10).toPrecision(3) + "0")
            // console.log(request)
            // console.log(rider)
            // try{
                // const user = await Users.findOne({name: senderName})
                // console.log(user)
                await Linker.create({
                    name: user.name,
                    category: user.role,
                    location: user.location,
                    phoneNumber: user.phoneNumber
                })
                .then(async (customerLinker) => {
                    const refNumber = crypto.randomBytes(8).toString("hex")
                    console.log(refNumber)
                    await Transactions.create({
                        refNumber: refNumber,
                        transactionCost: 500,
                        request: reqArray,
                        customer: customerLinker,
                    })
                    .then(async (transaction) => {
                        console.log(transaction)
                        user.transactions.push(transaction)
                        try{
                            await user.save()
                            // const ridersCompany = await Users.findById(ider._id)
                            // ridersCompany.transactions.push(transaction)
                            // closestRider.transactions.push(transaction)
                            // try{
                            //     await closestRider.save()
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
                                    if(riderLeft !== 0){
                                        return res.status(200).json({message: `Not Enough dispatch riders, ${riderLeft} left undispatched`})
                                    }
                                    else{
                                        res.status(201).json({message: "Transaction Successfully Created", transaction: transaction, usr: user})
                                    }
                                })
                                .catch(error => next(error))
                            }
                            // catch(error){
                            //     next(error)
                            // }
                        // }
                        catch(error){
                            next(error)
                        }
                    })
                    .catch(error => next(error))
                })
                .catch(error => next(error))
            }
            catch(error){
                next(error)
            }
        // try{
        //     const user = await Users.findById(userId)
        //     await Users.find({role: "rider"})
        //     .then(riders => {
        //         for (let i=0; i<riders.length; i++){
        //             if (riders[i].ridersAvailable > 0){
        //                 let riderLoc = JSON.parse(riders[i].location)
        //                 let dist = calculateDistance(senderLocation, riderLoc)
        //                 let distObj = {}
        //                 distObj["rider"] = riders[i]
        //                 distObj["distance"] = dist
        //                 distList.push(distObj)
        //             }
        //         }
        //         console.log(distList)
        //         const sortedList = distList.sort((a, b) => {
        //             return a.distance - b.distance
        //         })
        //         console.log(sortedList[0])
        //     })
        // res.status(200).json({message: "Successfully made the request"})
        // }
        // catch(error){
        //     console.log(error)
        // }
})

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

    const userId = req.params.uid

    const distList = []

    try{
        // const user = await Users.findById(userId)
        await Users.find({role: "rider"})
        .then(async (riders) => {
            for (let i=0; i<riders.length; i++){
                if (getAvailRider(riders[i])){
                    let riderLoc = JSON.parse(riders[i].mapLocation)
                    console.log(riderLoc)
                    let dist = calculateDistance(senderLocation, riderLoc)
                    let distObj = {}
                    distObj["rider"] = riders[i]
                    distObj["distance"] = dist
                    distList.push(distObj)
                }
            }
            // console.log(distList)
            const sortedList = distList.sort((a, b) => {
                return a.distance - b.distance
            })
            // console.log(sortedList[0])
            // console.log(closestRider)
            if (!sortedList[0]){
                console.log("Transaction not successful")
                res.status(201).json({message: "Transaction Not Successfully Created"})
            }
            // INSERTED CODE
            else{
                const closestRider = sortedList[0].rider
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
                                    // res.status(201).json({message: "Request Successfully Sent. Wait a moment for response", request: requestObj})
                                    // MODIFICATION START
                                    // const closestRider = await getClosestRider(req)
            
                                    
                                    const distance = calculateDistance(requestObj.sender.location, requestObj.recipient.location)
                                    const cost = distance * 500
                                    const transCost = Number((cost / 10).toPrecision(3) + "0")
                                    // console.log(request)
                                    // console.log(rider)
                                    // try{
                                        // const user = await Users.findOne({name: senderName})
                                        // console.log(user)
                                        await Linker.create({
                                            name: user.name,
                                            category: user.role,
                                            location: user.location,
                                            phoneNumber: user.phoneNumber
                                        })
                                        .then(async (customerLinker) => {
                                            await Linker.create({
                                                name: closestRider.name,
                                                category: closestRider.role,
                                                location: closestRider.location,
                                                phoneNumber: closestRider.phoneNumber
                                            })
                                            .then(async (riderCompanyLinker) => {
                                                const refNumber = crypto.randomBytes(8).toString("hex")
                                                await Transactions.create({
                                                    refNumber: refNumber,
                                                    transactionCost: transCost,
                                                    distance: distance,
                                                    request: requestObj,
                                                    customer: customerLinker,
                                                    riderCompany: riderCompanyLinker
                                                })
                                                .then(async (transaction) => {
                                                    user.transactions.push(transaction)
                                                    try{
                                                        await user.save()
                                                        // const ridersCompany = await Users.findById(ider._id)
                                                        // ridersCompany.transactions.push(transaction)
                                                        closestRider.transactions.push(transaction)
                                                        try{
                                                            await closestRider.save()
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
                                                                res.status(201).json({message: "Transaction Successfully Created", transaction: transaction, usr: user})
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
                                    // res.status(200).json({message: "Successfully made the request"})
                                    // }
                                    // catch(error){ catch for the closestrider try
                                    //     console.log(error)
                                    // }
            
            
                                    // MODIFICATION END
                                // }
                            //     catch(error){
                            //         next(error)
                            //     }
                            // })
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

            }

            // END INSERTED CODE
        })
        .catch(error => console.log(error))
    }
    catch(error){
        console.log(error)
    }
})

// router.post("/create-transaction", async function(req, res, next){
//     const senderName = req.body.senderName
//     const request = req.body.request
//     const rider = req.body.rider

//     // console.log(senderName)
//     // console.log("The request is ...")
//     // console.log(request.recipient.location)
//     // console.log(request.sender.location)
//     const distance = calculateDistance(request.sender.location, request.recipient.location)
//     const cost = distance * 500
//     const transCost = Number((cost / 10).toPrecision(3) + "0")
//     // console.log(request)
//     // console.log(rider)
//     try{
//         const user = await Users.findOne({name: senderName})
//         // console.log(user)
//         await Linker.create({
//             name: user.name,
//             category: user.role,
//             location: user.location,
//             phoneNumber: user.phoneNumber
//         })
//         .then(async (customerLinker) => {
//             await Linker.create({
//                 name: rider.name,
//                 category: rider.role,
//                 location: rider.location,
//                 phoneNumber: rider.phoneNumber
//             })
//             .then(async (riderCompanyLinker) => {
//                 const refNumber = crypto.randomBytes(8).toString("hex")
//                 await Transactions.create({
//                     refNumber: refNumber,
//                     transactionCost: transCost,
//                     distance: distance,
//                     request: request,
//                     customer: customerLinker,
//                     riderCompany: riderCompanyLinker
//                 })
//                 .then(async (transaction) => {
//                     user.transactions.push(transaction)
//                     try{
//                         await user.save()
//                         const ridersCompany = await Users.findById(rider._id)
//                         ridersCompany.transactions.push(transaction)
//                         try{
//                             await ridersCompany.save()
//                             await Users.find({role: "lmis"})
//                             .then(async (lmis) => {
//                                 for(let i=0; i<lmis.length; i++){
//                                     lmis[i].transactions.push(transaction)
//                                     try{
//                                         await lmis[i].save()
//                                     }
//                                     catch(error){
//                                         next(error)
//                                     }
//                                 }
//                                 const requestObj = await Request.findById(request._id)
//                                 requestObj.approved = true
//                                 console.log(requestObj)
//                                 try{
//                                     await requestObj.save()
//                                     res.status(201).json({message: "Transaction Successfully Created", transaction: transaction})
//                                 }
//                                 catch(error){
//                                     next(error)
//                                 }
//                             })
//                             .catch(error => next(error))
//                         }
//                         catch(error){
//                             next(error)
//                         }
//                     }
//                     catch(error){
//                         next(error)
//                     }
//                 })
//                 .catch(error => next(error))
//             })
//             .catch(error => next(error))
//         })
//         .catch(error => next(error))
//     }
//     catch(error){
//         next(error)
//     }
// })

router.post("/create-transaction", async function(req, res, next){
    const senderName = req.body.senderName
    const rider = req.body.rider

    // console.log(senderName)
    // console.log("The request is ...")
    // console.log(request.recipient.location)
    // console.log(request.sender.location)
    // const distance = calculateDistance(request.sender.location, request.recipient.location)
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
        const user = await Users.findById(userId)
        transaction.customerConfirm = true
        // console.log(transaction)
        try {
            await transaction.save()
            await Users.find({})
            .then( async (users) => {
                for (let i=0; i<users.length; i++){
                    try{
                        users[i].transactions.id(transId).customerConfirm = true
                    }catch(err){
                        continue
                    }
                    try {
                        await users[i].save()
                        // console.log("where is the error coming from") 
                    } catch (error) {
                        next(error)
                    }
                }
                res.status(200).json({message: "Transaction successfully confirmed", transaction: transaction, user: user})
            })
        } catch (error) {
            next(error)
        }
    }
    catch(error){
        next(error)
    }
})

router.put("/:uid/rider-confirm/:tid", async function(req, res, next){
    const userId = req.params.uid
    const transId = req.params.tid
    try{
        const transaction = await Transactions.findById(transId)
        const user = await Users.findById(userId)
        transaction.riderConfirm = true
        // console.log(transaction)
        try {
            await transaction.save()
            await Users.find({})
            .then( async (users) => {
                // console.log(users)
                for (let i=0; i<users.length; i++){
                    try{
                        users[i].transactions.id(transId).riderConfirm = true
                    }catch(err){
                        continue
                    }
                    try {
                        await users[i].save()
                        // console.log("where is the error coming from") 
                    } catch (error) {
                        next(error)
                    }
                }
                console.log("after the for loop")
                res.status(200).json({message: "Transaction successfully confirmed", transaction: transaction, user: user})
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
    await Transactions.findOneAndDelete({_id: transId})
    .then(async (trans) => {
        try {
            await Users.findOneAndUpdate({_id: userId}, {$pull: {transactions: {_id: transId}}})
            const user = await Users.findById(userId)
            res.status(200).json({message: "Transaction successfully Removed", user: user})
        } catch (error) {
            next(error)
        }
    })
    .catch(error => console.log(error))
})

module.exports = router