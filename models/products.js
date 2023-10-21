'use strict'

const mongoose = require('mongoose')

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    quantity: {
        type: String,
    },
    photo: {
        type: String,
        Default: "dont have a photo yet"
    }
})

const Products = mongoose.model("product", productSchema)
module.exports.Products = Products
module.exports.productSchema = productSchema