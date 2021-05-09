var express = require('express')
var router = express.Router()
var request = require('request')
var jwt = require('jsonwebtoken')
const global = require('./global')
const sql = require('../query.js')
const qs = require('qs')
const uniqid = require('uniqid')
const e = require('express')
router.use(express.json())

router.post('/createChatRoom', async function(req, res){
	let body = req.body
	body.chatRoomId = uniqid()
	
	let q = `INSERT INTO chatRoom VALUES ('${body.chatRoomId}', '${body.openerId}', 
	'${JSON.stringify(body.userList)}', '${JSON.stringify([])}', 
	UTC_TIMESTAMP(), UTC_TIMESTAMP())`
	let q_res = await sql(q)
	
	if(q_res.success){
		res.status(200).json({data:body})
	}else{
		res.status(403).send({message:q_res.errorMessage})
	}
})
router.post('/getChatNoticount', async function(req, res){
	let body = req.body
	body.chatRoomId = uniqid()
	
	let q = `SELECT chatRoom.*,
        (SELECT COUNT(*) FROM chat WHERE chat.chatRoomId=chatRoom.chatRoomId AND 
        chat.createdAt > (SELECT readTime from chat_readTime WHERE chat_readTime.userId='${body.userId}' AND chat_readTime.chatRoomId=chatRoom.chatRoomId)) AS notiCount,
    FROM chatRoom
    WHERE 
    JSON_CONTAINS(chatRoom.userList,'${JSON.stringify([body.userId])}')
	ORDER BY chatRoom.createdAt DESC`
	let q_res = await sql(q)
	
	if(q_res.success){
		res.status(200).json({data:body})
	}else{
		res.status(403).send({message:q_res.errorMessage})
	}
})
		
router.post('/getChatRoomList', async function(req, res){
	let body = req.body
	let q = `SELECT chatRoom.*,
        (SELECT COUNT(*) FROM chat WHERE chat.chatRoomId=chatRoom.chatRoomId AND 
        chat.createdAt > (SELECT readTime from chat_readTime WHERE chat_readTime.userId='${body.userId}' AND chat_readTime.chatRoomId=chatRoom.chatRoomId)) AS notiCount,
		
		(SELECT text FROM chat WHERE chatRoomId=chatRoom.chatRoomId ORDER BY createdAt DESC LIMIT 1  ) AS text,
		(SELECT imgList FROM chat WHERE chatRoomId=chatRoom.chatRoomId ORDER BY createdAt DESC LIMIT 1  ) AS imgList,
		(SELECT writerId FROM chat WHERE chatRoomId=chatRoom.chatRoomId ORDER BY createdAt DESC LIMIT 1  ) AS writerId
    FROM chatRoom
	WHERE
	NOT EXIST (SELECT targetId FROM block WHERE userId='${body.userId}' AND JSON_CONTAINS(chatRoom.userList,block.targetId)=0)  AND
    JSON_CONTAINS(chatRoom.outUserList,'${JSON.stringify([body.userId])}')=0 AND
    (
		(openerId = '${body.userId}') OR
    	((openerId <> '${body.userId}' AND JSON_CONTAINS(chatRoom.userList,'${JSON.stringify([body.userId])}') ) AND (SELECT COUNT(*) FROM chat WHERE chatRoomId = chatRoom.chatRoomId) > 0)
	)
	ORDER BY chatRoom.createdAt DESC`
	console.log(q)
	let q_res = await sql(q)
	if(q_res.success){
		let result_arr = []

		q_res.data.map(function(item){
			let obj = {}
			obj.chatId = item.chatId
			obj.chatRoomId = item.chatRoomId
			obj.openerId = item.openerId
			obj.userList = JSON.parse(item.userList)
			obj.outUserList = JSON.parse(item.outUserList)
			obj.createdAt = item.createdAt
			obj.commentCount = item.commentCount
			obj.notiCount = item.notiCount
			obj.lastChat = {
				imgList: JSON.parse(item.imgList),
				writerId: item.writerId,
				text: item.text,
				createdAt:item.lastChat_createdAt
			}
			result_arr.push(obj)
		})
		res.status(200).json({data:result_arr})
	}else{
		res.status(403).send({message:q_res.errorMessage})
	}
})
router.post('/getChatRoom', async function(req, res){
	let body = req.body

	let q = `SELECT * FROM chatRoom WHERE chatRoomId='${body.chatRoomId}'`
	let q2 = `SELECT * FROM user WHERE userId='${body.youId}'`

	let q_res = await sql(q)

	if(q_res.success){
		let q_res2 = await sql(q2)
		if(q_res2.success){
			q_res.data[0].userList = JSON.parse(q_res.data[0].userList)
			q_res.data[0].outUserList = JSON.parse(q_res.data[0].outUserList)
			
			let youData = q_res2.data[0]
			q_res.data[0].youData = {
				userId: youData.userId,
				addressData: JSON.parse(youData.addressData),
				isPublic: youData.isPublic,
				buildingName: youData.buildingName,
				houseType: youData.houseType
			} 
			res.status(200).json({data:q_res.data[0]})
		}else{
			res.status(403).send({message:q_res.errorMessage})
		}
	}else{
		
	}
})
router.post('/sendChatMessage', async function(req, res){
	let body = req.body
	body.chatId = uniqid()
	
	let q = `INSERT INTO chat VALUES ('${body.chatId}', '${body.chatRoomId}', '${body.writerId}', 
	'${JSON.stringify(body.userList)}','${JSON.stringify([])}', '${JSON.stringify(body.imgList)}', '${body.text}', 
	UTC_TIMESTAMP(), UTC_TIMESTAMP())`

	let q2 = `UPDATE chatRoom SET outUserList='${JSON.stringify([])}' 
	WHERE chatRoomId='${body.chatRoomId}'` //채팅방 나가기 한 경우 초기화 시키기

	
	let count_res = await sql(`SELECT COUNT(*) AS count FROM chat WHERE chatroomId='${body.chatRoomId}'`)
	if(count_res.data[0].count == 0){//첫 채팅 > alarm, type=1(채팅 알람), targetId=채팅방Id,
		let alarmaId = uniqid()
		let youId = body.youData.userId
		
		let targetData = {
			userId: body.writer.userId,
			buildingName: body.writer.buildingName
		}
		
		await sql(`INSERT INTO alarm VALUES ('${alarmaId}', '${youId}', 1, 
		'${body.chatRoomId}', '${JSON.stringify(targetData)}', 0, false, UTC_TIMESTAMP(), UTC_TIMESTAMP())`)
	}

	let q_res = await sql(q)
	if(q_res.success){
		let q_res2 = await sql(q2)
		if(q_res2.success){
			res.status(200).json({data:body})
		}else{
			res.status(403).send({message:q_res2.errorMessage})
		}
	}else{
		res.status(403).send({message:q_res.errorMessage})
	}
})
router.post('/getChatList', async function(req, res){
	let body = req.body

	let q = `SELECT * FROM chat WHERE 
	chatRoomId='${body.chatRoomId}' AND 
	JSON_CONTAINS(outUserList,'${JSON.stringify([body.userId])}')=0
	ORDER BY createdAt DESC LIMIT ${body.limit} OFFSET ${body.offset}`

	let q_res = await sql(q)
	
	if(q_res.success){
		q_res.data.map(
			item=> (item.imgList = JSON.parse(item.imgList), item.userList = JSON.parse(item.userList)))
		res.status(200).json({data:q_res.data})
	}else{
		res.status(403).send({message:q_res.errorMessage})
	}
})
router.post('/outChatRoom', async function(req, res){
	let body = req.body
	
	let q = `UPDATE chatRoom SET outUserList='${JSON.stringify(body.outUserList)}' WHERE
	chatRoomId='${body.chatRoomId}'`

	let q2 = `UPDATE chat SET outUserList='${JSON.stringify(body.outUserList)}' WHERE
			chatRoomId='${body.chatRoomId}'`

	let q_res = await sql(q)
	if(q_res.success){
		let q_res2 = await sql(q2)
		if(q_res2.success){
			res.status(200).json({data:q_res2.data})
		}else{
			res.status(403).send({message:q_res2.errorMessage})
		}
	}else{
		res.status(403).send({message:q_res.errorMessage})
	}
})
router.post('/checkChatRoomExist', async function(req, res){
	let body = req.body
	let q = `SELECT * FROM chatRoom WHERE 
	(JSON_CONTAINS(userList,'${JSON.stringify([body.openerId])}') AND 
	JSON_CONTAINS(userList,'${JSON.stringify([body.userId])}') )`
	
	let q_res = await sql(q)
	if(q_res.success){
		res.status(200).json({data:q_res.data[0]})
	}else{
		res.status(403).send({message:q_res.errorMessage})
	}
})

router.post('/updateChatReadTime', async function(req, res){
	let body = req.body
	let q = `INSERT INTO chat_readTime VALUES('${body.chatRoomId}','${body.userId}', UTC_TIMESTAMP(), UTC_TIMESTAMP(), UTC_TIMESTAMP())
	 ON DUPLICATE KEY UPDATE readTime=UTC_TIMESTAMP()`
	
	let q_res = await sql(q)
	if(q_res.success){
		res.status(200).json({data:q_res.data})
	}else{
		res.status(403).send({message:q_res.errorMessage})
	}
})


module.exports = router;