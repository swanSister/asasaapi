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

router.post('/getByKeyword', async function(req, res){
	let body = req.body
	
	if(body.limit == null || body.offset == null){
		res.status(403).json({data:'check parameter'})
		return
	}
	let topicQ = ''
	for(let i=0; i<body.topics.length; i++){
		if(i+1 < body.topics.length) topicQ += `post.topicId='${body.topics[i].topicId}' OR `
		else topicQ += `post.topicId='${body.topics[i].topicId}'`
	}

	if(!body.sort) body.sort = 1
	let sort = body.sort == 1 ? 'post.createdAt' : 
	(body.sort == 2 ? 'likeCount' : 
	(body.sort == 3) ? 'post.viewCount' : 'commentCount')
	
	let q = `SELECT user.*, topic.name AS topicName, post.*,
		(SELECT COUNT(*) FROM comment WHERE post.postId = comment.postId) commentCount,
		(SELECT COUNT(*) FROM like_user WHERE post.postId = like_user.postId) likeCount
		FROM post
		INNER JOIN user ON post.writerId=user.userId
		INNER JOIN topic ON post.topicId=topic.topicId
		WHERE (${topicQ}) AND (post.title LIKE '%${body.keyword}%' OR post.text LIKE '%${body.keyword}%')
		ORDER BY ${sort} DESC LIMIT ${body.limit} OFFSET ${body.offset} `

	let q_res = await sql(q)
	
	let result_arr = []
	if(q_res.success){
		q_res.data.map(function(item){
			let obj = {}
			obj.postId = item.postId
			obj.topicId = item.topicId
			obj.title = item.title
			obj.text = item.text
			obj.viewCount = item.viewCount
			obj.likeCount = item.likeCount
			obj.writerId = item.writerId
			obj.thumbnailUrl = item.thumbnailUrl
			obj.updatedAt = item.updatedAt
			obj.createdAt = item.createdAt
			obj.commentCount = item.commentCount
			
			obj.writer = {
				addressData: item.addressData,
				buildingName: item.buildingName,
				houseType: item.houseType,
				isPublic: item.isPublic,
				userId: item.userId,
			}
			result_arr.push(obj)
		})
		res.status(200).json({data:result_arr})
	}else{
		res.status(403).send({message:q_res.errorMessage})
	}
})

router.post('/getByTopicId', async function(req, res){
	let body = req.body
	if(body.limit == null || body.offset == null){
		res.status(403).json({data:'check parameter'})
		return
	}
	if(!body.sort) body.sort = 1
	let sort = body.sort == 1 ? 'post.createdAt' : 
	(body.sort == 2 ? 'likeCount' : 
	(body.sort == 3) ? 'post.viewCount' : 'commentCount')
	
	let q = `SELECT user.*, topic.name AS topicName, post.*,
		(SELECT COUNT(*) FROM comment WHERE post.postId = comment.postId) commentCount,
		(SELECT COUNT(*) FROM like_user WHERE post.postId = like_user.postId) likeCount
		FROM post
		INNER JOIN user ON post.writerId=user.userId
		INNER JOIN topic ON post.topicId=topic.topicId
		WHERE post.topicId='${req.body.topicId}'
		ORDER BY ${sort} DESC LIMIT ${body.limit} OFFSET ${body.offset} `

	let q_res = await sql(q)
	
	let result_arr = []
	if(q_res.success){
		q_res.data.map(function(item){
			let obj = {}
			obj.postId = item.postId
			obj.topicId = item.topicId
			obj.title = item.title
			obj.text = item.text
			obj.viewCount = item.viewCount
			obj.likeCount = item.likeCount
			obj.writerId = item.writerId
			obj.thumbnailUrl = item.thumbnailUrl
			obj.updatedAt = item.updatedAt
			obj.createdAt = item.createdAt
			obj.commentCount = item.commentCount
			
			obj.writer = {
				addressData: item.addressData,
				buildingName: item.buildingName,
				houseType: item.houseType,
				isPublic: item.isPublic,
				userId: item.userId,
			}
			result_arr.push(obj)
		})
		res.status(200).json({data:result_arr})
	}else{
		res.status(403).send({message:q_res.errorMessage})
	}
})

router.post('/getByMine', async function(req, res){
	let body = req.body
	
	let q_res = await sql(`(SELECT post.postId, post.title AS title, post.text, topic.name AS topicName, "1" AS type, post.createdAt from post 
	INNER JOIN topic ON post.topicId=topic.topicId
	WHERE post.writerId='${body.userId}'
	
	UNION

	SELECT comment.postId, "" AS title, comment.text, topic.name AS topicName, "2" AS type, comment.createdAt from comment 
		INNER JOIN post ON post.postId=comment.postId
		INNER JOIN topic ON post.topicId=topic.topicId
		WHERE comment.writerId='${body.userId}')

	ORDER BY createdAt DESC LIMIT ${body.limit} OFFSET ${body.offset}
	`)
	
	if(q_res.success){
		res.status(200).json({data:q_res.data})
	}else{
		res.status(403).send({message:q_res.errorMessage})
	}
})

router.post('/getByBookmark', async function(req, res){
	let body = req.body
	if(body.limit == null || body.offset == null){
		res.status(403).json({data:'check parameter'})
		return
	}
	if(!body.sort) body.sort = 1
	let sort = body.sort == 1 ? 'post.createdAt' : 
	(body.sort == 2 ? 'likeCount' : 
	(body.sort == 3) ? 'post.viewCount' : 'commentCount')
	
	let q = `SELECT user.*, topic.name AS topicName, post.*,
		(SELECT COUNT(*) FROM comment WHERE post.postId = comment.postId) commentCount,
		(SELECT COUNT(*) FROM like_user WHERE post.postId = like_user.postId) likeCount
		FROM post
		INNER JOIN user ON post.writerId=user.userId
		INNER JOIN topic ON post.topicId=topic.topicId
		INNER JOIN bookmark_user ON bookmark_user.userId='${body.userId}'
		WHERE post.postId=bookmark_user.postId
		ORDER BY ${sort} DESC LIMIT ${body.limit} OFFSET ${body.offset} `

	let q_res = await sql(q)
	
	let result_arr = []
	if(q_res.success){
		q_res.data.map(function(item){
			let obj = {}
			obj.postId = item.postId
			obj.topicId = item.topicId
			obj.title = item.title
			obj.text = item.text
			obj.viewCount = item.viewCount
			obj.likeCount = item.likeCount
			obj.writerId = item.writerId
			obj.thumbnailUrl = item.thumbnailUrl
			obj.updatedAt = item.updatedAt
			obj.createdAt = item.createdAt
			obj.commentCount = item.commentCount
			
			obj.writer = {
				addressData: item.addressData,
				buildingName: item.buildingName,
				houseType: item.houseType,
				isPublic: item.isPublic,
				userId: item.userId,
			}
			result_arr.push(obj)
		})
		res.status(200).json({data:result_arr})
	}else{
		res.status(403).send({message:q_res.errorMessage})
	}
})

router.post('/upload', async function(req, res){
	let body = req.body
	body.postId = uniqid()
	
	let q = `INSERT INTO post VALUES ('${body.postId}', '${body.topicId}', '${body.writerId}', '${body.title}', 
	'${body.text}', NULL, ${body.viewCount}, UTC_TIMESTAMP(), UTC_TIMESTAMP())`
	let q_res = await sql(q)
	
	if(q_res.success){
		res.status(200).json({data:body})
	}else{
		res.status(403).send({message:q_res.errorMessage})
	}
})
router.post('/getDetail', async function(req, res){
	let body = req.body
	let q_res = await sql(`SELECT user.*, topic.name AS topicName, post.*,
	(SELECT COUNT(*) FROM comment WHERE comment.postId = '${body.postId}') commentCount,
	(SELECT COUNT(*) FROM like_user WHERE like_user.postId = '${body.postId}') likeCount
	FROM post
	INNER JOIN user ON post.writerId=user.userId
	INNER JOIN topic ON post.topicId=topic.topicId
	WHERE post.postId='${body.postId}'`)

	if(q_res.success){
		
		let item = q_res.data[0]
		let obj = {}
			obj.postId = item.postId
			obj.topicId = item.topicId
			obj.title = item.title
			obj.text = item.text
			obj.viewCount = item.viewCount
			obj.likeCount = item.likeCount
			obj.commentCount = item.commentCount
			obj.writerId = item.writerId
			obj.thumbnailUrl = item.thumbnailUrl
			obj.createdAt = item.createdAt
			obj.updatedAt = item.updatedAt
			
			obj.writer = {
				addressData: item.addressData,
				buildingName: item.buildingName,
				houseType: item.houseType,
				isPublic: item.isPublic,
				userId: item.userId,
			}
		
		let q_res2 = await sql(`SELECT * FROM post_img 
		WHERE postId='${body.postId}'`)
		obj.imgList = q_res2.data
		res.status(200).json({data:obj})
	}else{
		res.status(403).send({message:q_res.errorMessage})
	}
})

router.post('/setViewCount', async function(req, res){
	let body = req.body
	
	let q_res = await sql(`UPDATE post SET viewCount = viewCount + 1
    WHERE postId = '${body.postId}'`)

	if(q_res.success){
		res.status(200).json({data:q_res.data})
	}else{
		res.status(403).send({message:q_res.errorMessage})
	}
})

router.post('/setLike', async function(req, res){
	let body = req.body
	
	let q_res = await sql(`INSERT INTO like_user (postId, userId, createdAt, updatedAt)
	SELECT '${body.postId}', '${body.userId}', UTC_TIMESTAMP(), UTC_TIMESTAMP()
	WHERE NOT EXISTS (SELECT postId FROM like_user WHERE postId='${body.postId}' AND userId='${body.userId}')`)
	
	console.log(q_res.data)
	if(q_res.success){
		let q_res2 = await sql(`SELECT postId FROM like_user WHERE userId='${body.userId}'`)
		if(q_res2.success){
			res.status(200).json({data:q_res2.data})
		}else{
			res.status(403).send({message:q_res2.errorMessage})
		}
	}else{
		res.status(403).send({message:q_res.errorMessage})
	}
})

router.post('/unLike', async function(req, res){
	let body = req.body
	
	let q_res = await sql(`DELETE FROM like_user WHERE postId='${body.postId}' AND userId='${body.userId}'`)
	if(q_res.success){
		let q_res2 = await sql(`SELECT postId FROM like_user WHERE userId='${body.userId}'`)
		if(q_res2.success){
			res.status(200).json({data:q_res2.data})
		}else{
			res.status(403).send({message:q_res2.errorMessage})
		}
	}else{
		res.status(403).send({message:q_res.errorMessage})
	}
})

router.post('/getLikeList', async function(req, res){
	let body = req.body

	let q_res = await sql(`SELECT postId FROM like_user WHERE userId='${body.userId}'`)
	if(q_res.success){
		res.status(200).json({data:q_res.data})
	}else{
		res.status(403).send({message:q_res.errorMessage})
	}
})

router.post('/setBookmark', async function(req, res){
	let body = req.body
	
	let q_res = await sql(`INSERT INTO bookmark_user (postId, userId, createdAt, updatedAt)
	SELECT '${body.postId}', '${body.userId}', UTC_TIMESTAMP(), UTC_TIMESTAMP()
	WHERE NOT EXISTS (SELECT postId FROM bookmark_user WHERE postId='${body.postId}' AND userId='${body.userId}')`)
	
	console.log(q_res.data)
	if(q_res.success){
		let q_res2 = await sql(`SELECT postId FROM bookmark_user WHERE userId='${body.userId}'`)
		if(q_res2.success){
			res.status(200).json({data:q_res2.data})
		}else{
			res.status(403).send({message:q_res2.errorMessage})
		}
	}else{
		res.status(403).send({message:q_res.errorMessage})
	}
})

router.post('/unBookmark', async function(req, res){
	let body = req.body
	
	let q_res = await sql(`DELETE FROM bookmark_user WHERE postId='${body.postId}' AND userId='${body.userId}'`)
	if(q_res.success){
		let q_res2 = await sql(`SELECT postId FROM bookmark_user WHERE userId='${body.userId}'`)
		if(q_res2.success){
			res.status(200).json({data:q_res2.data})
		}else{
			res.status(403).send({message:q_res2.errorMessage})
		}
	}else{
		res.status(403).send({message:q_res.errorMessage})
	}
})

router.post('/getBookmarkList', async function(req, res){
	let body = req.body

	let q_res = await sql(`SELECT postId FROM bookmark_user WHERE userId='${body.userId}'`)
	if(q_res.success){
		res.status(200).json({data:q_res.data})
	}else{
		res.status(403).send({message:q_res.errorMessage})
	}
})


module.exports = router;