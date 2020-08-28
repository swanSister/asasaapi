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

router.post('/getAlarm', async function(req, res){
	let body = req.body

	let q = `SELECT * FROM alarm WHERE userId='${body.userId}' ORDER BY updatedAt DESC LIMIT ${body.limit} OFFSET ${body.offset}`

	let q_res = await sql(q)

	if(q_res.success){
		res.status(200).json({data:q_res.data})
	}else{
		res.status(403).send({message:q_res.errorMessage})
	}
})



module.exports = router;