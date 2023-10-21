'use strict'
const mongoose =  require('mongoose')

const lmisSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    request: [requestSchema],
    transactions: [transactionSchema],
    
})

const Lmis = mongoose.model("lmis", lmisSchema)
const Request = mongoose.model("request", requestSchema)
const Recipient = mongoose.model("recipient", recipientSchema)
module.exports.Lmis = Lmis
module.exports.Request = Request
module.exports.Recipient = Recipient