const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const crypto = require('crypto');
const { check, body, validationResult } = require('express-validator');

// create express instance and set port
const port = 3000;
const DOMAIN_NAME = 'localhost';
const app = express();
app.use(bodyParser.json());

// For test uses only. Not for prod.
app.use(cors({origin: '*'}));

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
    body('name', 'Please pick a name longer than 3 characters').trim().escape().isLength({ min: 3 }),
    body('comment', 'Please make a comment longer than 5 characters').trim().escape().isLength({ min: 3 }),
    body('email', 'Please enter a valid email address').normalizeEmail().isEmail(),
  ]
}

// Define the validation rules template for titles (being extra safe here, theoretically these should never change)
const titleValidationRules = () => {
  return [
    check('title').escape()
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
app.get('/comments', titleValidationRules(), validate, (req, res) => {
  const title = req.query.title;
  db.all('SELECT * FROM comments WHERE title = ?', [title], (err, rows) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.send(rows);
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
  const { title, name, email, comment } = req.body;
  const UID = crypto.createHash('md5').update(name + email).digest('hex');

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
          // create a new PRNG string for the user to be able to delete their comment
          const randomString = crypto.randomBytes(16).toString('hex');
          db.run("INSERT INTO comments (DELETION_UID, date, title, name, comment) VALUES (?, strftime('%Y-%m-%d %H:%M:%S CST'), ?, ?, ?)", 
                [randomString, title, name, comment], function(err) {
            if (err) {
              console.error(err.message);
            } else {
              console.log("Comment added successfully");
              res.send('You may delete your comment by navigating to: ' + DOMAIN_NAME + '/comments?' + randomString);
            }
          });
        } // username already exists, but UID doesn't match, "authentication" failed!
        else {
          // Send JSON error message
          res.send('Please choose a different username, or use the correct email address');
        }
      });
    } // username doesn't exist so we need to add it and the comment to the database
    else {
      // create a new PRNG string for the user to be able to delete their comment
      const randomString = crypto.randomBytes(16).toString('hex');
      db.run("INSERT INTO users (UID, name, email) VALUES (?, ?, ?)", [UID, name, email], function(err) {
        if (err) {
          console.error(err.message);
        } 
      });
      db.run("INSERT INTO comments (DELETION_UID, date, title, name, comment) VALUES (?, strftime('%Y-%m-%d %H:%M:%S CST'), ?, ?, ?)", 
            [randomString, title, name, comment], function(err) {
        if (err) {
          console.error(err.message);
        }
      });
      console.log("Comment added successfully2");
      res.send('You may delete your comment by navigating to: ' + DOMAIN_NAME + '/comments?' + randomString);
    }
  });
})


// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});