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

router.post('/getList', async function(req, res){
	let body = req.body
	if(body.limit == null || body.offset == null){
		res.status(403).json({data:'check parameter'})
		return
	}
	let q = `SELECT comment.* FROM comment
		INNER JOIN user ON comment.writerId=user.userId
		WHERE comment.postId='${body.postId}'
		ORDER BY comment.createdAt DESC LIMIT ${body.limit} OFFSET ${body.offset} `
		
		let q_res = await sql(q)
		if(q_res.success){
			q_res.data.map(function(item){
				item.writer = JSON.parse(item.writer)
				item.imgList = JSON.parse(item.imgList)
			})
			res.status(200).json({data:q_res.data})
		}else{
			res.status(403).send({message:q_res.errorMessage})
		}
})
router.post('/upload', async function(req, res){
	let body = req.body
	body.commentId = uniqid()
	let q = `INSERT INTO comment VALUES ('${body.commentId}', '${body.postId}', '${body.writerId}','${JSON.stringify(body.writer)}', '${body.text}',
	'${JSON.stringify([])}',
	UTC_TIMESTAMP(), UTC_TIMESTAMP())`
	let q_res = await sql(q)
	if(q_res.success){
		res.status(200).json({data:body})
	}else{
		res.status(403).send({message:q_res.errorMessage})
	}
})
router.post('/deleteById', async function(req, res){
	let body = req.body
	if(body.imgList.length){
		for(var i in body.imgList){// url ex) https://api.asasakorea.com/uploads/post/392o59qke115ozk_0_post.jpeg
			let filePath = body.imgList[i].replace('https://api.asasakorea.com','.')
			try {
				fs.unlinkSync(filePath)
			  } catch (err) {
				console.error(err)
			  }
		}
	}
	let q_res = await sql(`DELETE FROM comment WHERE commentId='${body.commentId}'`)
	if(q_res.success){
		res.status(200).json({data:q_res.data})
	}else{
		res.status(403).send({message:q_res.errorMessage})
	}
})
module.exports = router;