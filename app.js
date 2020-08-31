const express = require('express')
const app = express()
const port = 3000
var cors = require('cors');

const users = require('./routes/users')
const images = require('./routes/images')
const posts = require('./routes/posts')
const comments = require('./routes/comments')
const chat = require('./routes/chat')
const notice = require('./routes/notice')
const alarm = require('./routes/alarm')

const io = require('socket.io')(3003);
app.use(cors())
app.use('/users', users);
app.use('/posts', posts);
app.use('/comments', comments);
app.use('/images', images);
app.use('/chat', chat);
app.use('/notice', notice);
app.use('/alarm', alarm);

app.set('socketio', io); 

io.on('connection', (socket) => {
  
    socket.on('join', function(room) {
      socket.join(room);
      socket.room = room;
    });

    socket.on('joinList', function(userId) {
      console.log('userjoin',userId)
      socket.join(userId);
      socket.userId = userId;
    });

    socket.on('message', function (data) {
      console.log('send msg',data.message.writerId)
        io.sockets.in(data.message.chatRoomId).emit('message', data.message);
        io.sockets.in(data.message.youId).emit('listMessage', data.message);//chat list message
    });

    socket.on('disconnect', () => {
     //console.log('user disconnected');
    });
  });

app.get('/uploads/*', function(req, res, path){
    var imagePath =  __dirname+req.url
    res.sendFile(`${imagePath}`);
  })
app.listen(port, () => console.log(`Example app listening on port ${port}!`))