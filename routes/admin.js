var express = require('express')
var router = express.Router()
var request = require('request')
var jwt = require('jsonwebtoken')
const global = require('./global')
const sql = require('../query.js')
const qs = require('qs')
const uniqid = require('uniqid');
const e = require('express')
router.use(express.json())

router.post('/login', async function(req, res){
	let body = req.body
	if(body.password == 'dbwjd12')
		res.status(200).json({data:"success"})
	else
		res.status(200).json({data:"fail"})
	
})



module.exports = router;