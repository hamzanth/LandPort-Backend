'use strict'

const mongoose = require('mongoose')

const customerSchema = new mongoose.Schema({
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
    phoneNumber: {
        type: Number
    }
})

const Customers = mongoose.model("customer", customerSchema)
module.exports.Customers = Customers
module.exports.customerSchema = customerSchema