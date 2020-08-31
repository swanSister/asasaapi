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

router.get('/test/get', async function(req, res){
	let q = `SELECT * FROM user`
	let rest = await sql(q)
	res.status(200).json({data:rest.data})
})

router.post('/isUserExist',async function(req, res){
	let q_res = await sql(`SELECT * FROM user WHERE userId='${req.body.userId}'`)

	if(q_res.success){
		res.status(200).json({data:q_res.data});
	}else{
		res.status(403).send({message:q_res.errorMessage})
	}
})
async function insertTopic(id, name){
	await sql(`INSERT INTO topic SELECT '${id}', '${name}', UTC_TIMESTAMP(), UTC_TIMESTAMP() WHERE NOT EXISTS (SELECT topicId FROM topic WHERE topicId='${id}')`)
}
async function insertTopicUser(topicId, userId){
	await sql(`INSERT INTO topic_user SELECT '${topicId}', '${userId}', UTC_TIMESTAMP(), UTC_TIMESTAMP() WHERE NOT EXISTS (SELECT topicId FROM topic_user WHERE topicId='${topicId}' AND userId='${userId}')`)
}
router.post('/create', async function(req, res){
	//test insert user
	let	authId = uniqid(), authImgUrl=''
	let body = req.body

	body.authId = authId
	body.authImgUrl = authImgUrl

	body.isAuthWait = true
	body.isAuthSuccess = false
	body.authReason = ''
	
	//Insert to user
	let q = `INSERT INTO user VALUES ('${body.userId}', ${body.isPublic}, '${authId}', 
	'${authImgUrl}', '${JSON.stringify(body.addressData)}','${body.buildingName}',${body.houseType}, UTC_TIMESTAMP(), UTC_TIMESTAMP())`
	
	//Insert to auth
	let q2 = `INSERT INTO auth VALUES ('${body.authId}', '${body.userId}', ${body.isAuthWait}, ${body.isAuthSuccess}, 
	'${body.authReason}', UTC_TIMESTAMP(), UTC_TIMESTAMP() )`

	var q_res = await sql(q)
	if(q_res.success){
		q_res = await sql(q2)
		if(q_res.success){
			//create Topics
			let mainTopic = {topicId:'0_main', name:'토픽'}
			
			insertTopic(mainTopic.topicId, mainTopic.name)
			insertTopicUser(mainTopic.topicId, body.userId)

			let topics = await sql(`SELECT topic.topicId, topic.name FROM topic 
			INNER JOIN topic_user ON 
			topic.topicId=topic_user.topicId AND '${body.userId}'=topic_user.userId`)
			
			body.topics = topics.data
			res.status(200).json({data:body})
		}else{
			res.status(403).send({message:q_res.errorMessage})
		}
	}else{
		res.status(403).send({message:q_res.errorMessage})
	}
})

router.post('/patch', async function(req, res){
	//test insert user
	let body = req.body

	body.authId = uniqid()
	body.authImgUrl = ''

	body.isAuthWait = true
	body.isAuthSuccess = false
	body.authReason = ''
	

	await sql(`DELETE FROM topic_user WHERE userId='${body.userId}'`)
	await sql(`DELETE FROM auth WHERE userId='${body.userId}'`)

	//Insert to user
	let q = `UPDATE user SET 
	isPublic=${body.isPublic}, authId='${body.authId}', authImgUrl='${body.authImgUrl}',
	addressData='${JSON.stringify(body.addressData)}', buildingName='${body.buildingName}',houseType=${body.houseType} 
	WHERE userId='${body.userId}'`
	
	//Insert to auth
	let q2 = `INSERT INTO auth VALUES ('${body.authId}', '${body.userId}', ${body.isAuthWait}, ${body.isAuthSuccess}, 
	'${body.authReason}', UTC_TIMESTAMP(), UTC_TIMESTAMP() )`

	var q_res = await sql(q)
	if(q_res.success){
		q_res = await sql(q2)
		if(q_res.success){
			//create Topics
			let mainTopic = {topicId:'0_main', name:'토픽'}
			
			insertTopic(mainTopic.topicId, mainTopic.name)
			insertTopicUser(mainTopic.topicId, body.userId)

			let topics = await sql(`SELECT topic.topicId, topic.name FROM topic 
			INNER JOIN topic_user ON 
			topic.topicId=topic_user.topicId AND '${body.userId}'=topic_user.userId`)
			
			body.topics = topics.data
			res.status(200).json({data:body})
		}else{
			res.status(403).send({message:q_res.errorMessage})
		}
	}else{
		res.status(403).send({message:q_res.errorMessage})
	}
})

router.post('/getByUserId', async function(req, res){
	let body = req.body

	let q_res = await sql(`SELECT user.*, auth.* FROM user
	LEFT JOIN auth ON auth.userId=user.userId
	WHERE user.userId='${body.userId}'`)

	if(q_res.success){
		if(q_res.data.length){
			let topics = await sql(`SELECT topic.topicId, topic.name FROM topic 
			INNER JOIN topic_user ON 
			topic.topicId=topic_user.topicId AND '${body.userId}'=topic_user.userId`)
			q_res.data[0].addressData = JSON.parse(q_res.data[0].addressData)
			q_res.data[0].topics = topics.data
			res.status(200).json({data:q_res.data[0]})
		}else{
			res.status(200).json({data:null})
		}
	}else{
		res.status(403).send({message:q_res.errorMessage})
	}
})
router.post('/getUncertifiedUsers', async function(req, res){
	let body = req.body

	let q_res = await sql(`SELECT user.*, auth.* FROM user
	INNER JOIN auth ON auth.userId=user.userId
	WHERE auth.isAuthWait=true
	ORDER BY auth.createdAt DESC LIMIT ${body.limit} OFFSET ${body.offset}`)
	
	if(q_res.success){
		q_res.data.map(item => item.addressData = JSON.parse(item.addressData))
		res.status(200).json({data:q_res.data})
	}else{
		res.status(403).send({message:q_res.errorMessage})
	}
})

router.patch('/setAuth', async function(req, res){
	let body = req.body
	let addressData = body.addressData
	console.log(body)
	let q_res = await sql(`UPDATE auth 
	SET isAuthWait=${body.isAuthWait}, isAuthSuccess=${body.isAuthSuccess}, authReason='${body.authReason}'
	WHERE authId='${body.authId}'`)
	if(q_res.success){
		console.log(q_res.data)
		if(body.isAuthSuccess){
			if(addressData.sido_code && addressData.sido){
				insertTopic(`sido_${addressData.sido_code}`, addressData.sido)
				insertTopicUser(`sido_${addressData.sido_code}`, body.userId)
			}
			if(addressData.sigungu_code && addressData.sigungu){
				insertTopic(`sigungu_${addressData.sigungu_code}`, addressData.sigungu)
				insertTopicUser(`sigungu_${addressData.sigungu_code}`, body.userId)
			}
			if(addressData.b_code && addressData.bname){
				insertTopic(`b_${addressData.b_code}`, addressData.bname)
				insertTopicUser(`b_${addressData.b_code}`, body.userId)
			}
			if(body.houseType == 1 && addressData.buildingName && addressData.buildingCode){//아파트별 토픽 생성
				addressData.buildingCode = addressData.buildingCode.substring(0,14)
				insertTopic(`building_${addressData.buildingCode}`, addressData.buildingName)
				insertTopicUser(`building_${addressData.buildingCode}`, body.userId)
			}
		}
		res.status(200).json({data:null})
	}else{
		res.status(403).send({message:q_res.errorMessage})
	}
})
router.post('/setPublic', async function(req, res){
	let body = req.body
	let q_res = await sql(`UPDATE user SET ispublic=${body.isPublic} WHERE userId='${body.userId}'`)
	
	if(q_res.success){
		res.status(200).json({data:body})
	}else{
		res.status(403).send({message:q_res.errorMessage})
	}
})



module.exports = router;