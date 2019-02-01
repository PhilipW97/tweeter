const express = require('express')
const app = express()
const morgan = require('morgan')
const mysql = require('mysql')
const bodyParser = require("body-parser")
const session = require('express-session')
const bcrypt = require('bcrypt')


app.use(session({secret: 'your secret', saveUninitialized: true, resave: false}));
app.use(bodyParser.urlencoded({extended: false}))
app.use(express.static('public'));
app.use(morgan('short'))
app.set('view engine', 'ejs');

  


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Connection functions
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.listen(3003, () => {
  console.log("Server is up and listening on 3003...")
})


function getConnection() {
  return mysql.createConnection({
    host: 'db',
    user: 'root',
    password: 'example',
    database: 'tweeter',
    multipleStatements: true
  })
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Start Page
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get('/', (req, res) => {
  res.render('start')
})


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Start Page
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get('/register', (req, res) => {
  res.render('register')
})



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// returns all tweets
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get('/tweets', (req, res) => {
  const userID = req.params.id
  const queryString = "SELECT tweets.time, tweets.content, users.username FROM tweets INNER JOIN users ON users.id = tweets.user_id ORDER BY tweets.time" 
  const connection = getConnection()
  connection.query(queryString, [userID], (err, rows, fields) => {
    if (err) {
      console.log("failed to query user: " + err)
      res.sendStatus(500)
      return
    }

    const users = rows.map((row) => {
      return row
    })

    for(var i = users.length - 1; i > -1 ;i--) {
      users[i].time = convertDate(users[i].time )
    }

    if (users.length > 0) {
      res.render('latestTweets', {array: users})
    } else {
      res.render('latestTweets', {array: [] })
    }
  })
})


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// return detailed information for a single tweet
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get("/tweets/:id", (req, res) => {
  const userID = req.params.id
  const yourID = req.session.user
  const connection = getConnection()
  const queryString = "SELECT tweets.id, tweets.content, tweets.user_id, tweets.time, users.username FROM tweets INNER JOIN users ON tweets.user_id = users.id AND tweets.id = ? LIMIT 1"
  
  if(yourID == null) {
    res.redirect('/tweets')
    return
  }

  connection.query(queryString, [userID], (err, rows, fields) => { 
    if(err || rows.length == 0) {
      console.log("Tweet could not be found")
      res.sendStatus(404)
      return
    }

    const users = rows.map((row) => {
      return row
    })

    endDate = convertDate(users[0].time)
    res.render('singleTweet', {array: users, date: endDate, yourID: yourID})
  })
})


function convertDate(unformattedDate) {
   const date = new Date(unformattedDate)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getUTCDate()
    const hour = date.getHours()
    const minute = date.getMinutes()
    return day + "." + month + "." + year + ", " + hour + ":" + minute 
}

 
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// return detailed information for a single user
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get('/users/:id', (req, res) => {
  const userID = req.params.id
  const yourID = req.session.user
  const connection = getConnection()

  if(yourID == null) {
    res.redirect('/tweets')
    return
  }

  connection.query('SELECT * FROM users WHERE id = ?; SELECT COUNT(*) AS count FROM followers WHERE followers.following = ?; SELECT COUNT(*) AS count FROM followers WHERE followers.follower = ?; SELECT tweets.content, tweets.time, users.username, tweets.id FROM tweets INNER JOIN users WHERE tweets.user_id = ? AND tweets.user_id = users.id; SELECT COUNT(*) AS count FROM followers WHERE follower = ? AND following = ?' ,[userID, userID, userID, userID, yourID, userID], (err, rows, fields) => {
    if (err || rows.length == 0) {
      res.sendStatus(404)
      return
    }

    const users = rows.map((row) => {
      return row
    })

    const user = users[0][0].username
    var uid = users[0][0].id
    const followers = users[1][0].count - 1
    const following = users[2][0].count - 1
    const tweetsNumber = users[3].length
    const tweets = users[3]
    var follows = ""
    var display = ""
    
    

// Handles the Follow Button
    if (userID == yourID) {
      uid = ""
      follows = ""
      display = "none"
    } else if(users[4][0].count > 0) {
      follows = "Unfollow"
      uid = "/unfollow/" + uid
      display = "inline"
    } else {
     follows = "Follow"
      uid = "/follow/" + uid
      display = "inline"
    }

    for(var i = tweets.length - 1; i > -1 ;i--) {
      tweets[i].time = convertDate(tweets[i].time )
    }

    res.render('user', {uid: uid, username: user, array: tweets, following: following, followers: followers, tweets: tweetsNumber, follows: follows, display: display})
  })
})




////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// shows tweets from the users you follow.
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  app.get("/home", (req, res) => {
    const connection = getConnection()
    const queryString = "SELECT tweets.user_id, tweets.time, tweets.id, tweets.content, users.username FROM tweets INNER JOIN followers ON followers.follower = ? AND tweets.user_id = followers.following LEFT JOIN users ON tweets.user_id = users.id ORDER BY tweets.time"
    const uid = req.session.user

    if(uid == null) {
      console.log("This one runs")
      res.redirect('/tweets')
      return
    }

    connection.query(queryString, [uid], (err, rows, fields) => { 
      if(err) {
        res.sendStatus(err)
        return
      }
  
      const users = rows.map((row) => {
        return row
      })

     for(var i = users.length - 1; i > -1 ;i--) {
       users[i].time = convertDate(users[i].time )
     }

      
      if (users.length > 0) {
        res.render('home', {array: users})
      } else {
        res.render('home', {array: [] })
      }
    })
  })



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Creates a new user
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.post('/createUser', (req, res) => {
  const name = req.body.name
  const username = req.body.username
  const password = req.body.password
  const connection = getConnection()
  const queryString = "INSERT INTO users (name, username, password) VALUES (?, ?, ?)"
  const query = "INSERT INTO followers (follower, following) VALUES (?, ?)"

  bcrypt.hash(password, 10, function(err, hash) {
    if (err) {
      console.log("Failed to create account. Sorry for that. ")
      res.sendStatus(500)
      return
    }

    connection.query(queryString, [name, username, hash], (err, results, fields) => {
      if(err) {
        console.log("Failed to create account. Sorry for that.")
        res.sendStatus(500)
        return
      }
  
      const newID = results.insertId
  
      connection.query(query, [newID, newID], (err, rows, fields) => {
        if (err) {
          console.log("ERROR")
        }
  
        req.session.user = newID
        res.redirect('/home')
      })
    })
  })
})




////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Creates a new Tweet
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.post('/tweets', (req, res) => {
  const content = req.body.content
  const user = req.session.user
  const time = getDate()
  const connection = getConnection()
  const queryString = "INSERT INTO tweets (content, user_id, time) VALUES (?, ?, ?)"

  if(user == null) {
    res.redirect('/tweets')
    return
  }

  connection.query(queryString, [content, user, time], (err, results, fields) => {
    if(err) {
      console.log(err)
      res.sendStatus(500)
      return
    }

    console.log("Inserted new post")
    res.redirect('/home')
  })
})


function getDate() {
    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth() + 1; //January is 0!
    var hh = today.getHours();
    var MM = today.getMinutes();

    var yyyy = today.getFullYear();
    if (dd < 10) {
        dd = '0' + dd;
    } 
    if (mm < 10) {
        mm = '0' + mm;
    } 
    return yyyy + "-" + mm + "-" + dd + ":" + hh + ":" + MM;
}





////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Follows a User
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.post('/follow/:id', (req, res) => {
  const follower = req.session.user
  const following = req.params.id
  const connection = getConnection()
  const queryString = "INSERT INTO followers (follower, following) VALUES (?, ?)"

  if(follower == null) {
    res.redirect('/tweets')
    return
  }

  if (follower == null) {
    res.sendStatus(403)
    console.log("There is no logged in user.")
    return
  } else if (following == null) {
    res.sendStatus(404)
    console.log("User could not be found.")
    return
  }

  connection.query(queryString, [follower, following], (err, results, fields) => {
    if(err) {
      console.log("Failed to follow user.")
      res.sendStatus(500)
      return
    }  

    res.redirect('/users/' + following)
  })
})


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Unfollows User
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.post('/unfollow/:id', (req, res) => {
  const follower = req.session.user
  const following = req.params.id
  const connection = getConnection()
  const queryString = "DELETE FROM followers WHERE follower = ? AND following = ? "

  if(follower == null) {
    res.redirect('/tweets')
    return
  }

  connection.query(queryString, [follower, following], (err, results, fields) => {
    if(err) {
      console.log("Failed to follow user.")
      res.sendStatus(500)
      return
    }
      
    res.redirect('/users/' + following)
  })
})




////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Logout User
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.post('/logout', (req, res) => {
  const uid = req.session.user
  if(uid == null) {
    res.redirect('/tweets')
    return
  }
  
  req.session.destroy();
  res.redirect('/')
})



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Delete Tweet
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.post('/delete/:id', (req, res) => {
  const tweetID = req.params.id
  const queryString = "DELETE FROM tweets WHERE id = ?"
  const connection = getConnection()
  const uid = req.session.user

  if(uid == null) {
    res.redirect('/tweets')
    return
  }

  connection.query(queryString, [tweetID], (err, results, fields) => {
    if(err) {

    }
    res.redirect('/home')
  })
})



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Search for Users
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.post('/search', (req, res) => {
  const searchWord = req.body.search
  const queryString = "SELECT * FROM users WHERE upper(username) LIKE upper(CONCAT('%', ? , '%')) OR upper(name) LIKE upper(CONCAT('%', ? , '%'))"
  const connection = getConnection()
  const uid = req.session.user

  if(uid == null) {
    res.redirect('/tweets')
    return
  }

  connection.query(queryString, [searchWord, searchWord], (err, rows, fields) => {
    if(err) {
      return
    }

    var users = rows.map((row) => {
      return row
    })

    if(users.length == 0) {
      console.log("users length is zero")
      users = [{id: 0 ,name: '', username: 'No User with this Username' }]
    }

    console.log(searchWord)

    res.render('search', {array: users})
  }) 
})



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Login User
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.post('/login', (req, res) => {
  const connection = getConnection()
  const username = req.body.username
  const password = req.body.password
  const queryString = 'SELECT users.password, users.id FROM users WHERE username = ?'

  connection.query(queryString, [username], (err, rows, fields)  => {
    if(err){
      return
    }

    var hash = rows.map((row) => {
      return row.password
    })

    var id = rows.map((row) => {
      return row.id
    })

   bcrypt.compare(String(password) , String(hash), function(err, result) {
     console.log("result: " + result)
      if(result) {
        req.session.user = id
       res.redirect('/home')
       return
      } else {
        res.redirect('/')
        return
      } 
    });
  })
})


