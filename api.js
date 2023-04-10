const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const crypto = require('crypto');
const { rateLimiter }= require('./rateLimiter');
const { check, body, validationResult } = require('express-validator');

// create express instance and set port
const port = 3000;
const DOMAIN_NAME = 'https://dylancramer.ai';
const app = express();
app.use(bodyParser.json());

// For test uses only. Not for prod.
app.use(cors({origin: '*'}));

// Set up rate limiting for flood protection
app.use(rateLimiter);

// Create a new SQLite database
const db = new sqlite3.Database('commentsv1.db');

// Create tables for both users and the comments made
db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT, 
  uid TEXT, 
  name TEXT, 
  email TEXT)`);
db.run(`CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deletion_uid TEXT,
  date TEXT,
  title TEXT,
  name TEXT,
  comment TEXT)`);


// Define the validation rules template for recieving comments
const commentValidationRules = () => {
  return [
    body('title').trim().escape().isLength({ min: 3 }),
    body('name', 'Please pick a name longer than 3 characters').trim().escape(),
    body('comment', 'Please make a comment longer than 5 characters').trim().escape().isLength({ min: 3 }),
    body('email', 'Please enter a valid email address').normalizeEmail(),
  ]
}

// Define the validation rules template for titles (being extra safe here, theoretically these should never change)
const textValidationRules = () => {
  return [
    check('text').escape()
  ]
}

// Validation function itself, maps all the validation rules and returns an array of errors
const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (errors.isEmpty()) {
    return next()
  }
  const extractedErrors = []
  errors.array().map(err => extractedErrors.push({ [err.param]: err.msg }))

  return res.status(422).json({
    errors: extractedErrors,
  })
}

// Get all comments using the title parameter to filter the database
app.get('/comments', textValidationRules(), validate, (req, res) => {
  const title = req.query.title;
  db.all('SELECT * FROM comments WHERE title = ?', [title], (err, rows) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.send(rows);
    }
  });
})

// Delete comment with given UID using the deletion_uid parameter to filter the database
app.get('/delete', textValidationRules(), validate, (req, res) => {
  const UID = req.query.UID;
  console.log(UID);
  // make the query to delete the comment from the database
  db.run(`DELETE FROM comments WHERE deletion_uid = ?`, [UID], (err) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.send(200);
    }
  });
})

// Get all users
app.get('/users', (req, res) => {
  db.all('SELECT * FROM users', (err, rows) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.send(rows);
    }
  });
});

// Check if the username is already in the database, if it is, ensure the uid matches the name+email.
// If it is not, add the user to the database. If the user is already in the database and the uid doesn't match, throw an error.
app.post('/comments', commentValidationRules(), validate, (req, res) => {
  var { name, email } = req.body;
  const UID = crypto.createHash('md5').update(name + email).digest('hex');

  // check if name is empty, both fields are empty, or only an email is given. in all cases,
  // add the comment as Anonymous
  if (name === '') {
    postComment(req, res, true);
  } else {
  // check if the name already exists in the database
  db.get("SELECT EXISTS(SELECT 1 FROM users WHERE name = ?) AS result", [name], function(err, row) {
    if (err) {
      console.error(err.message);
    } // if the username exists
    else if (row.result === 1) {
      // check if the UID matches the one in the database
      db.get("SELECT EXISTS(SELECT 1 FROM users WHERE UID = ?) AS result", [UID], function(err, row) {
        if (err) {
          console.error(err.message);
        } // if the UID matches, add the comment
        else if (row.result === 1) {
          postComment(req, res, false);
        } // username already exists, but UID doesn't match, "authentication" failed!
        else {
          // Send JSON error message
          res.send('Please choose a different username, or use the correct email address');
        }
      });
    } // username doesn't exist so we need to add it and the comment to the database
    else {
      db.run("INSERT INTO users (UID, name, email) VALUES (?, ?, ?)", [UID, name, email], function(err) {
        if (err) {
          console.error(err.message);
        } 
      });
      postComment(req, res, false);
    }
  });
  }
})

const postComment = (req, res, anon) => {
  // Generate a hash for a one-time use deletion code
  const randomString = crypto.randomBytes(16).toString('hex');
  var { title, name, comment } = req.body;
  if (anon) {
    name = 'Anonymous';
  }
  db.run("INSERT INTO comments (DELETION_UID, date, title, name, comment) VALUES (?, strftime('%Y-%m-%d %H:%M:%S'), ?, ?, ?)", 
            [randomString, title, name, comment], function(err) {
        if (err) {
          console.error(err.message);
        }
  });
  res.send('You may delete your comment by navigating to: ' + DOMAIN_NAME + '/delete?UID=' + randomString);
  console.log("Comment added successfully");
}


// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});