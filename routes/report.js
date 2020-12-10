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

router.post('/upload', async function(req, res){

	let body = req.body
	body.reportId = uniqid()

	let q = `INSERT INTO report VALUES ('${body.reportId}', '${body.userId}','${body.targetId}', 
	'${body.reportType}', '${body.reason}', '${body.etc}',
	 UTC_TIMESTAMP(), UTC_TIMESTAMP())`
	
	 let q_res = await sql(q)
	
	if(q_res.success){
		res.status(200).json({data:body})
	}else{
		res.status(403).send({message:q_res.errorMessage})
	}
})
router.post('/get', async function(req, res){
	let body = req.body
	let q_res = await sql(`SELECT * FROM report ORDER BY createdAt DESC LIMIT ${body.limit} OFFSET ${body.offset}`)
												
	if(q_res.success){
		res.status(200).json({data:q_res.data})
	}else{
		res.status(403).send({message:q_res.errorMessage})
	}
})

module.exports = router;