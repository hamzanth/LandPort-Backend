'use strict'

const mongoose = require('mongoose')

const ridersSchema = new mongoose.Schema({
    name: {
        type: String,
        default: "Dont have a name yet"
    },
    phoneNumber: {
        type: Number
    },
    location: {
        type: String,
        default: "not known yet"
    },
    priceCharged: {
        type: Number,
        default: 0
    }
})

const RiderCompanys = mongoose.model("riders", ridersSchema)
module.exports.RiderCompanys = RiderCompanys
module.exports.ridersSchema = ridersSchema