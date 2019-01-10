
//install npm: express and socket.io
//For cookies inspall npm cookies and nom cookie-parser
const express = require('express')
const bodyParser = require('body-parser')
var cookieParser = require('cookie-parser')
const app = express()
const http = require('http').Server(app)
const io = require('socket.io')(http)
app.use(express.static('public'));
app.use(cookieParser())
app.use(bodyParser.urlencoded({extended: true}))
app.set('view engine', 'ejs')

class Poll {
  constructor(title, options, id) {
    this.title = title
    this.options = options
    this.id = id
    this.comments = []
    this.totalResponses = 0
    this.totalComments = 0
    this.responses = Array(options.length).fill(0)
    this.list=Array();

  }
  respond(choiceIndex) {
    this.responses[choiceIndex]++
    this.totalResponses++
  }
  //adding a top level reply only,meaning that it has a depth of 0
  addCommentTop(user, text) {
    this.comments.push(new Comment(user,this.totalComments,text,0))
    this.totalComments++;
  }

}

class Comment {
  constructor(user,id,text,depth){
    this.depth = depth
    this.text = text
    this.id = id
    this.user = user
    this.subComments = [] //array of comment objects
    this.numSubComments = 0
    this.upvotes = 0 ;
    this.downvotes = 0 ;
  }

  //for replying to a comment, it has a variable depth which is superComment depth + 1
  //depth can also be used to add a variable indentation in the html
  //also superComment is the comment object not the id, in the future we can send an array of IDs to find the comment strain if need be
  addCommentReply(username,text){
    this.subComments.push(new Comment(username,this.numSubComments,text,this.depth+1))
    this.numSubComments++
  }
}

const polls = [];
polls.push(new Poll('Hit or miss?', ['hit', 'miss'], 0))
polls.push(new Poll('Yes or no?', ['yes', 'no'], 1))

var userID = 0//ID given to each user in the cookies
io.on('connection', function(socket,req,res){
  console.log('a user connected')
  socket.on('disconnect', function() {
    console.log('user disconnected')
  })
})

app.get('/getuser', (req, res)=>{
  //shows all the cookies
  res.send(req.cookies);
});

app.get('/', function (req, res) {
  //show all polls
  //console.log(req.cookies['userID'])//Read user's ID from cookies if it's null then run function
  if (req.cookies["userID"]==null){//requests the userID if it doesnt exits then...
    userID++
    res.cookie("userID", userID);//sets the userID for a new user
    //console.log("new user " +req.cookies)
  }
  res.render('index', {
    polls: polls
  })
})

app.post('/newpoll', (req, res)=> {
  res.render('newpoll')
})

app.get('/poll/:id', (req, res) => {
  //show the user one poll
  id = req.params.id
  if (polls[id]) {
    res.render('singlepoll', {
      poll: polls[id],
      id: id
    })
  }
  else {
    res.status(404).send()
  }
})

app.post('/poll/:id/comment', (req, res) => {
  const id = req.params.id
  const user = req.body.user
  const text = req.body.text
  if (!polls[id]) {
    res.status(404).send()
  }
  else {
    polls[id].addCommentTop(user, text)
    res.redirect('/poll/' + id)
  }
})

//adding a reply to a comment need a button for this
app.post('/poll/:id/comment/:superComment',(req,res)=>{
  const id = req.params.id
  const superComment = JSON.parse(req.params.superComment)
  const user = req.body.user
  const text = req.body.text
  if (!polls[id] || !polls[id].superComment) {
    res.status(404).send()
  }
  else {
    polls[id].superComment.addCommentReply(user,text)
  }
})

app.post('/poll/:id/response', (req, res) => {//if userID has already voted for THIS poll then do not ADD another vote but change to new one
  //submit poll response
  const id = req.params.id
  const choice = req.body.choice
  console.log("Received response to poll " + id + ", choice: " + choice)
  let voted=id.toString()+"/"+req.cookies["userID"].toString()
  let condition=false;
  console.log(voted)

  if (!polls[id]) {
    res.status(404).send()
  }
  else{//ADD if voted
    polls[id].list.forEach(function(element){
        console.log(element)
        if(element==voted){
          condition=true;
          console.log("TRUE")
        }
      });
    if(condition){
      console.log("you have already voted")
    }else{
      polls[id].list.push(voted)
      polls[id].respond(choice)
      io.emit('new poll responses', {
        id: id,
        responses: polls[id].responses
      })
      res.status(200).send()
    }
  }
})

app.post('/poll', (req, res) => {
  //submit new poll
  console.log(req.body)
  const title = req.body.title
  const options = []
  let i = 1
  while (req.body['option' + i]) {
    options.push(req.body['option' + i])
    i++
  }
  console.log(options)
  polls.push(new Poll(title, options, polls.length))
  res.redirect('/')
})

http.listen(3000,function(){
  console.log('pollster listening on port 3k')
})
