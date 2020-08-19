var express = require('express')
var router = express.Router()
var request = require('request')
var jwt = require('jsonwebtoken')
const global = require('./global')
const sql = require('../query.js')
const qs = require('qs')
const uniqid = require('uniqid');
const e = require('express')
const fs = require('fs')
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
	
	let q = `SELECT topic.name AS topicName, post.*,
		(SELECT COUNT(*) FROM comment WHERE post.postId = comment.postId) commentCount,
		(SELECT COUNT(*) FROM like_user WHERE post.postId = like_user.postId) likeCount
		FROM post
		INNER JOIN topic ON post.topicId=topic.topicId
		WHERE (${topicQ}) AND (post.title LIKE '%${body.keyword}%' OR post.text LIKE '%${body.keyword}%')
		ORDER BY ${sort} DESC LIMIT ${body.limit} OFFSET ${body.offset} `

	let q_res = await sql(q)
	
	if(q_res.success){
		q_res.data.map(function(item){
			item.writer = JSON.parse(item.writer)
		})
		res.status(200).json({data:q_res.data})
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
	
	let q = `SELECT topic.name AS topicName, post.*,
		(SELECT COUNT(*) FROM comment WHERE post.postId = comment.postId) commentCount,
		(SELECT COUNT(*) FROM like_user WHERE post.postId = like_user.postId) likeCount
		FROM post
		INNER JOIN topic ON post.topicId=topic.topicId
		WHERE post.topicId='${req.body.topicId}'
		ORDER BY ${sort} DESC LIMIT ${body.limit} OFFSET ${body.offset} `

	let q_res = await sql(q)
	
	if(q_res.success){
		q_res.data.map(function(item){
			item.writer = JSON.parse(item.writer)
		})
		res.status(200).json({data:q_res.data})
	}else{
		res.status(403).send({message:q_res.errorMessage})
	}
})

router.post('/getByMine', async function(req, res){
	let body = req.body
	let q = `SELECT post.postId, post.title AS title, post.text, topic.name AS topicName, "1" AS type, post.createdAt from post 
	INNER JOIN topic ON post.topicId=topic.topicId
	WHERE post.writerId='${body.userId}'
	UNION
	SELECT comment.postId, "" AS title, comment.text, topic.name AS topicName, "2" AS type, comment.createdAt from comment 
		INNER JOIN post ON post.postId=comment.postId
		INNER JOIN topic ON post.topicId=topic.topicId
		WHERE comment.writerId='${body.userId}'
	ORDER BY createdAt DESC LIMIT ${body.limit} OFFSET ${body.offset}
	`
	let q_res = await sql(q)
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
	
	let q = `SELECT topic.name AS topicName, post.*,
		(SELECT COUNT(*) FROM comment WHERE post.postId = comment.postId) commentCount,
		(SELECT COUNT(*) FROM like_user WHERE post.postId = like_user.postId) likeCount
		FROM post
		INNER JOIN topic ON post.topicId=topic.topicId
		INNER JOIN bookmark_user ON bookmark_user.userId='${body.userId}'
		WHERE post.postId=bookmark_user.postId
		ORDER BY ${sort} DESC LIMIT ${body.limit} OFFSET ${body.offset} `

	let q_res = await sql(q)
	
	if(q_res.success){
		q_res.data.map(function(item){
			item.writer = JSON.parse(item.writer)
		})
		res.status(200).json({data:q_res.data})
	}else{
		res.status(403).send({message:q_res.errorMessage})
	}
})

router.post('/upload', async function(req, res){
	let body = req.body
	body.postId = uniqid()
	console.log("upload post:", body)
	let q = `INSERT INTO post VALUES ('${body.postId}', '${body.topicId}', '${body.writerId}', '${JSON.stringify(body.writer)}','${body.title}', 
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
	let q_res = await sql(`SELECT topic.name AS topicName, post.*,
	(SELECT COUNT(*) FROM comment WHERE comment.postId = '${body.postId}') commentCount,
	(SELECT COUNT(*) FROM like_user WHERE like_user.postId = '${body.postId}') likeCount
	FROM post
	INNER JOIN topic ON post.topicId=topic.topicId
	WHERE post.postId='${body.postId}'`)
	
	if(q_res.success){
		let item = q_res.data[0]
		item.writer = JSON.parse(item.writer)
		
		let q_res2 = await sql(`SELECT * FROM post_img 
		WHERE postId='${body.postId}'`)
		item.imgList = q_res2.data

		res.status(200).json({data:item})
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

router.post('/deleteById', async function(req, res){
	let body = req.body
	if(body.imgList.length){
		for(var i in body.imgList){ // url ex) https://api.asasakorea.com/uploads/post/392o59qke115ozk_0_post.jpeg
			let filePath = body.imgList[i].url.replace('https://api.asasakorea.com','.')
			try {
				fs.unlinkSync(filePath)
			  } catch (err) {
				console.error(err)
			  }
		}
	}
	let q_res = await sql(`DELETE FROM post WHERE postId='${body.postId}'`)
	if(q_res.success){
		//댓글 제거
		let commentList = await sql(`SELECT * FROM comment WHERE postId='${body.postId}'`)
		for(var i in commentList.data){
			let imgList = JSON.parse(commentList.data[i].imgList)
			if(imgList.length){
				for(var j in imgList){
					let filePath = imgList[j].replace('https://api.asasakorea.com','.')
					try {
						fs.unlinkSync(filePath)
					  } catch (err) {
						console.error(err)
					  }
				}
			}
		}
		await sql(`SELECT FROM comment WHERE postId='${body.postId}'`)
		res.status(200).json({data:q_res.data})
	}else{
		res.status(403).send({message:q_res.errorMessage})
	}
})


module.exports = router;