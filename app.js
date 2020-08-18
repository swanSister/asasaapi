const express = require('express')
const app = express()
const port = 3001
var cors = require('cors');

const users = require('./routes/users')
const images = require('./routes/images')
const posts = require('./routes/posts')
const comments = require('./routes/comments')
const chat = require('./routes/chat')
const notice = require('./routes/notice')
const io = require('socket.io')(3002);

app.use(cors())
app.use('/users', users);
app.use('/posts', posts);
app.use('/comments', comments);
app.use('/images', images);
app.use('/chat', chat);
app.use('/notice', notice);
app.set('socketio', io); 

io.on('connection', (socket) => {
  
    socket.on('join', function(room) {
      socket.join(room);
      socket.room = room;
    });

    socket.on('message', function (data) {
        io.sockets.in(data.message.chatRoomId).emit('message', data.message);
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