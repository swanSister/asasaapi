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
	body.blockId = uniqid()

	let q = `INSERT INTO block VALUES ('${body.blockId}', '${body.userId}','${body.targetId}', UTC_TIMESTAMP(), UTC_TIMESTAMP())`
	
	let q_res = await sql(q)
	
	if(q_res.success){
		res.status(200).json({data:body})
	}else{
		res.status(403).send({message:q_res.errorMessage})
	}
})
router.post('/get', async function(req, res){
	let body = req.body
	let q_res = await sql(`SELECT * FROM block WHERE userId='${body.userId}' ORDER BY createdAt DESC LIMIT ${body.limit} OFFSET ${body.offset}`)
												
	if(q_res.success){
		res.status(200).json({data:q_res.data})
	}else{
		res.status(403).send({message:q_res.errorMessage})
	}
})

router.post('/delete', async function(req, res){
	let body = req.body
	let q_res = await sql(`DELETE FROM block WHERE userId='${body.userId}' AND targetId='${body.targetId}'`)
	
	for(var i in body.imgList){ // url ex) https://api.asasakorea.com/uploads/post/392o59qke115ozk_0_post.jpeg
		let filePath = body.imgList[i].url.replace('https://api.asasakorea.com','.')
		try {
			fs.unlinkSync(filePath)
		  } catch (err) {
			console.error(err)
		  }
	}

	if(q_res.success){
		res.status(200).json({data:q_res.data})
	}else{
		res.status(403).send({message:q_res.errorMessage})
	}
})


module.exports = router;