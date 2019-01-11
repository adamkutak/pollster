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
  changeResponse(oldIndex, newIndex) {
    this.responses[oldIndex]--
    this.responses[newIndex]++
  }
  addComment(user, text) {
    this.totalComments++;
    this.comments.push({
      user: user,
      text: text
    })
  }
}

const polls = [];
polls.push(new Poll('Hit or miss?', ['hit', 'miss'], 0))
polls.push(new Poll('Yes or no?', ['yes', 'no'], 1))

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

function _processUser(req, res) {
  let id
  if (req.cookies["userID"]) {
    id = req.cookies["userID"]
  }
  else {
    id = usersChoices.length
    res.cookie("userID", id)
  }
  return id
}

const usersChoices = [];

function processUser(req, res) {
  const userId = _processUser(req, res);
  if (!usersChoices[userId]) {
    console.log("Created user choices array for user " + userId)
    usersChoices[userId] = [];
  }
  return userId
}

function getUsersChoiceId(userId, pollId) {
  try {
    return usersChoices[userId][pollId]
  }
  catch (error) {
    return undefined
  }
}

function storeUsersChoiceId(userId, pollId, choiceId) {
  console.log(arguments)
  usersChoices[userId][pollId] = choiceId
}

app.get('/', function (req, res) {
  //show all polls
  //console.log(req.cookies['userID'])//Read user's ID from cookies if it's null then run function
  const userID = processUser(req, res)
  const choices = usersChoices[userID] ? usersChoices[userID] : []
  console.log(choices)
  res.render('index', {
    polls: polls,
    choices: choices
  })
})

app.post('/newpoll', (req, res)=> {
  res.render('newpoll')
})

app.get('/poll/:id', (req, res) => {
  //show the user one poll
  const id = req.params.id
  const userId = processUser(req, res)
  if (polls[id]) {
    res.render('singlepoll', {
      poll: polls[id],
      choice: getUsersChoiceId(userId, id),
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
    polls[id].addComment(user, text)
    res.redirect('/poll/' + id)
  }
})

app.post('/poll/:id/response', (req, res) => {//if userID has already voted for THIS poll then do not ADD another vote but change to new one
  //submit poll response
  const id = req.params.id
  const choice = req.body.choice
  console.log("Received response to poll " + id + ", choice: " + choice)
  const userId = processUser(req, res)

  if (!polls[id]) {
    res.status(404).send()
  }
  else{//ADD if voted
    if (getUsersChoiceId(userId, id) !== undefined) {
      polls[id].changeResponse(getUsersChoiceId(userId, id), choice)
    }
    else {
      polls[id].respond(choice)
    }
    storeUsersChoiceId(userId, id, choice)
    io.emit('new poll responses', {
      id: id,
      responses: polls[id].responses
    })
    res.status(200).send()
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
