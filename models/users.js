'use strict'

const mongoose = require('mongoose')
const productSchema = require('./products').productSchema

const TransPersonSchema = new mongoose.Schema({
    category: {
        type: String
    },
    name: {
        type: String,
        trim: true
    },
    location: {
        latitude: Number,
        longitude: Number
    },
    phoneNumber: {
        type: Number
    }
})

const linkerSchema = new mongoose.Schema({
    category: {
        type: String
    },
    name: {
        type: String
    },
    location: {
        type: String
    },
    phoneNumber: {
        type: Number
    },
})

const riderSchema = mongoose.Schema({
    available: {
        type: Boolean,
        default: true
    },
    plateNumber: {
        type: String,
        default: "",
        trim: true
    },
    riderName: {
        type: String,
        default: ""
    },
    bikeColor: {
        type: String,
        default: "black"
    },
    dateAdded: {
        type: Date,
        default: Date.now
    },
    imageUrl: {
        type: String,
        default: ""
    }
    
})

const requestSchema = new mongoose.Schema({
    date: {
        type: Date,
        default: Date.now
    },
    approved: {
        type: Boolean,
        default: false
    },
    distance: {
        type: Number,
    },
    transactionCost: {
        type: Number,
    },
    sender: TransPersonSchema,
    recipient: TransPersonSchema,
    product: productSchema,
    rider: riderSchema,
    riderCompany: linkerSchema
})

const transactionSchema = new mongoose.Schema({
    refNumber: {
        type: String
    },
    dateCreated: {
        type: Date,
        default: Date.now
    },
    completed: {
        type: Boolean,
        default: false
    },
    customerConfirm: {
        type: Boolean,
        default: false
    },
    riderConfirm: {
        type: Boolean,
        default: false
    },
    transactionCost: {
        type: Number,
    },
    request: [requestSchema],
    customer: linkerSchema, 
})

const UserSchema = mongoose.Schema({
    role: {
        type: String,
        default: "customer"
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        trim: true
    },
    location: {
        type: String,
        default: "not known yet"
    },
    mapLocation: {
        type: String,
        default: "not known yet"
    },
    phoneNumber: {
        type: Number
    },
    priceCharged: {
        type: Number,
        default: 0
    },
    pushToken: {
        type: String,
        default: ""
    },
    // totalRiders: {
    //     type: Number,
    //     default: 5
    // },
    // ridersAvailable: {
    //     type: Number, 
    //     default: 0
    // },
    riders: [riderSchema],
    transactions: [transactionSchema],
    requests: [requestSchema]
})

const Riders = mongoose.model("rider", riderSchema)
const Users = mongoose.model("user", UserSchema)
const Request = mongoose.model("request", requestSchema)
const TransPerson = mongoose.model("transperson", TransPersonSchema)
const Transactions = mongoose.model("transaction", transactionSchema)
const Linker = mongoose.model("linker", linkerSchema)

module.exports.Riders = Riders
module.exports.Users = Users
module.exports.UserSchema = UserSchema
module.exports.Request = Request
module.exports.TransPerson = TransPerson
module.exports.TransPersonSchema = TransPersonSchema
module.exports.Transactions = Transactions
module.exports.Linker = Linker
module.exports.transactionSchema = transactionSchema