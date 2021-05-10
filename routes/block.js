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
	
	let q_res = await sql(`SELECT block.*, user.isPublic, user.houseType, user.addressData FROM block
	INNER JOIN user ON block.userId=user.userId
	WHERE block.userId='${body.userId}'
	ORDER BY block.createdAt DESC LIMIT ${body.limit} OFFSET ${body.offset}`)
	
	if(q_res.success){
		let result_arr = []

		q_res.data.map(function(item){
			let obj = {}
			obj.blockId = item.blockId
			obj.userId = item.userId
			obj.targetId = item.targetId
			obj.createdAt = item.createdAt
			obj.updatedAt = item.updatedAt
			obj.targetInfo = {
				isPublic: item.isPublic,
				houseType: item.houseType,
				addressData: JSON.parse(item.addressData)
			}
			result_arr.push(obj)
			
		})
		res.status(200).json({data:result_arr})
	}else{
		res.status(403).send({message:q_res.errorMessage})
	}
})

router.post('/delete', async function(req, res){
	let body = req.body

	let q_res = await sql(`DELETE FROM block WHERE userId='${body.userId}' AND targetId='${body.targetId}'`)
	if(q_res.success){
		
		let chatRoomList = await sql(`SELECT * FROM chatRoom WHERE 
		(JSON_CONTAINS(userList,'${JSON.stringify([body.userId])}') AND 
		JSON_CONTAINS(userList,'${JSON.stringify([body.userId])}') )`)
		if(chatRoomList.success){
			console.log(chatRoomList)
			for(let i in chatRoomList.data){
				console.log("#######")
				console.log(chatRoomList.data[i])
				await sql(`UPDATE chatRoom SET outUserList='["${body.userId}"]' WHERE
				chatRoomId='${chatRoomList.data[i].chatRoomId}'`)
			
				await sql(`UPDATE chat SET outUserList='["${body.userId}"]' WHERE
				chatRoomId='${chatRoomList.data[i].chatRoomId}'`)
			}
		}
		res.status(200).json({data:q_res.data})
	}else{
		res.status(403).send({message:q_res.errorMessage})
	}
})


module.exports = router;