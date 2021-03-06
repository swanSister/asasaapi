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
	body.noticeId = uniqid()

	let q = `INSERT INTO notice VALUES ('${body.noticeId}', '${body.writerId}','${JSON.stringify(body.writer)}', '${body.title}', '${body.text}',
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
	let q_res = await sql(`SELECT * FROM notice ORDER BY createdAt DESC LIMIT ${body.limit} OFFSET ${body.offset}`)
												
	if(q_res.success){
		res.status(200).json({data:q_res.data})
	}else{
		res.status(403).send({message:q_res.errorMessage})
	}
})
router.post('/getDetail', async function(req, res){
	let body = req.body
	let q_res = await sql(`SELECT * FROM notice WHERE noticeId='${body.noticeId}'`)
												
	if(q_res.success){
		let item = q_res.data[0]
		item.writer = JSON.parse(item.writer)
		
		let q_res2 = await sql(`SELECT * FROM notice_img 
		WHERE noticeId='${body.noticeId}'`)
		item.imgList = q_res2.data

		res.status(200).json({data:item})
	}else{
		res.status(403).send({message:q_res.errorMessage})
	}
})
router.post('/delete', async function(req, res){
	let body = req.body
	let q_res = await sql(`DELETE FROM notice WHERE noticeId='${body.noticeId}'`)
	
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