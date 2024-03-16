const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const app = express()
app.use(express.json())

const dbPath = path.join(__dirname, 'twitterClone.db')

let db = null

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server is Running At http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}

initializeDBAndServer()

const authenticateToken = (request, response, next) => {
  let jwtToken
  const authHeader = request.headers['authorization']

  if (authHeader !== undefined) {
    jwtToken = authHeader.split(' ')[1]
  }
  if (jwtToken === undefined) {
    response.status(401)
    response.send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToken, 'MY_SECRET_TOKEN', async (error, payload) => {
      if (error) {
        response.status(401)
        response.send('Invalid JWT Token')
      } else {
        request.username = payload.username
        next()
      }
    })
  }
}

app.post('/register/', async (request, response) => {
  try {
    const {username, password, name, gender} = request.body
    const hashedPassword = await bcrypt.hash(request.body.password, 10)
    const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`
    const dbUser = await db.get(selectUserQuery)
    if (dbUser === undefined) {
      const createUserQuery = `
      INSERT INTO 
        user (username, password, name, gender) 
      VALUES 
        (
          '${username}', 
          '${hashedPassword}', 
          '${name}',
          '${gender}'
          
        );`
      if (password.length < 6) {
        response.status(400)
        response.send('Password is too short')
      } else {
        await db.run(createUserQuery)
        response.send('User created successfully')
      }
    } else {
      response.status(400)
      response.send('User already exists')
    }
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
  }
})

app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`
  const dbUser = await db.get(selectUserQuery)
  if (dbUser === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password)
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      }
      const jwtToken = jwt.sign(payload, 'MY_SECRET_TOKEN')
      response.send({jwtToken})
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})

//API 3

app.get('/user/tweets/feed/', authenticateToken, async (request, response) => {
  const {username} = request
  const userDetails = `SELECT * FROM user WHERE username = '${username}'`
  console.log(userDetails)
  const tweetsQuery = `
SELECT
user.username, tweet.tweet, tweet.date_time AS dateTime
FROM
follower
INNER JOIN tweet
ON follower.following_user_id = tweet.user_id
INNER JOIN user
ON tweet.user_id = user.user_id
WHERE
follower.follower_user_id = ${1}
ORDER BY
tweet.date_time DESC
LIMIT 4;`

  const tweets = await db.all(tweetsQuery)
  response.send(tweets)
})

//API 4
app.get('/user/following/', authenticateToken, async (request, response) => {
  const getListOfAllNames = `
  SELECT 
    user.name
    FROM user INNER JOIN follower ON user.user_id = follower.following_user_id
    GROUP BY
    user.name;`
  const followingUsers = await db.all(getListOfAllNames)
  response.send(followingUsers)
})

//API 5

app.get('/user/followers/', authenticateToken, async (request, response) => {
  const getListOfAllNames = `
  SELECT 
    user.name
    FROM user INNER JOIN follower ON user.user_id = follower.follower_user_id
    GROUP BY
    user.name;`
  const followers = await db.all(getListOfAllNames)
  response.send(followers)
})

//API 6

app.get('/tweets/:tweetId/', authenticateToken, async (request, response) => {
  const {tweetId} = request.params
  const {username} = request
  const userId = `SELECT user_id FROM user WHERE username = '${username};`
  const isValid = `SELECT * FROM tweet INNER JOIN user ON tweet.user_id = user.user_id WHERE tweet.user_id = '${userId};`
  if (isValid === undefined) {
    response.status(401)
    response.send('Invalid Request')
  }
})

//API 7

app.get(
  '/tweets/:tweetId/likes/',
  authenticateToken,
  async (request, response) => {
    const {username} = request
    const userId = `SELECT user_id FROM user WHERE username = '${username};`
    const isValid = `SELECT * FROM tweet INNER JOIN user ON tweet.user_id = user.user_id WHERE tweet.user_id = '${userId};`
    if (isValid === undefined) {
      response.status(401)
      response.send('Invalid Request')
    } else {
    }
  },
)

//API 8

app.get(
  '/tweets/:tweetId/replies/',
  authenticateToken,
  async (request, response) => {},
)

//API 9

app.get('/user/tweets/', authenticateToken, async (request, response) => {})

//API10

app.post('/user/tweets/', authenticateToken, async (request, response) => {
  const {tweet} = request.body

  let create = `INSERT INTO tweet(tweet) VALUES ('${tweet}');`
  const tweets = await db.all(create)
  response.send('Created a Tweet')
})

//API 11

app.delete(
  '/tweets/:tweetId/',
  authenticateToken,

  async (request, response) => {
    const {tweetId} = request.params
    const {username} = request
    let isValidId = `SELECT * FROM tweet WHERE user_id = '${7}'`
    console.log(isValidId)
    if (isValidId === undefined) {
      response.status(401)
      response.send('Invalid Request')
    } else {
      const getDeleteQuery = `DELETE FROM tweet WHERE tweet_id = '${tweetId}'`
      const deleteTweet = await db.run(getDeleteQuery)
      response.send('Tweet Removed')
    }
  },
)

module.exports = app
