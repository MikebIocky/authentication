if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
  }
  
  const fs = require('fs')
  const path = require('path')
  const express = require('express')
  const bcrypt = require('bcrypt')
  const passport = require('passport')
  const flash = require('express-flash')
  const session = require('express-session')
  const methodOverride = require('method-override')
  
  const initializePassport = require('./passport-config')
  initializePassport(
    passport,
    email => users.find(user => user.email === email),
    id => users.find(user => user.id === id)
  )
  
  // Load user data from file
  const USERS_FILE = path.join(__dirname, 'data', 'users.json');
  let users = [];
  
  // Ensure 'data' folder exists
  if (!fs.existsSync(path.dirname(USERS_FILE))) {
    fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
  }
  
  // Load users from JSON file
  if (fs.existsSync(USERS_FILE)) {
    users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  }
  
  const app = express()
  
  app.set('view-engine', 'ejs')
  app.use(express.urlencoded({ extended: false }))
  app.use(flash())
  app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
  }))
  app.use(passport.initialize())
  app.use(passport.session())
  app.use(methodOverride('_method'))
  
  app.get('/', checkAuthenticated, (req, res) => {
    res.render('index.ejs', { name: req.user.name })
  })
  
  app.get('/login', checkNotAuthenticated, (req, res) => {
    res.render('login.ejs')
  })
  
  app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
  }))
  
  app.get('/register', checkNotAuthenticated, (req, res) => {
    res.render('register.ejs')
  })
  
  app.post('/register', checkNotAuthenticated, async (req, res) => {
    try {
        // Check if email already exists
        const existingUser = users.find(user => user.email === req.body.email);
        if (existingUser) {
            req.flash('error', 'A user with this email address already exists.');
            return res.redirect('/register');
        }

        // If email is unique, proceed with registration
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const newUser = {
            id: Date.now().toString(),
            name: req.body.name,
            email: req.body.email,
            password: hashedPassword,
        };
        users.push(newUser);

        // Save updated users to file
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

        res.redirect('/login');
    } catch {
        req.flash('error', 'An error occurred while registering. Please try again.');
        res.redirect('/register');
    }
});

app.get("/api/users", (req, res) => {
  const dataPath = path.join(__dirname, "data/users.json");

  fs.readFile(dataPath, "utf-8", (err, data) => {
    if (err) {
      return res.status(500).send({ message: "Error reading users file." });
    }

    const users = JSON.parse(data);
    res.send(users);
  });
});
  
  app.delete('/logout', (req, res) => {
    req.logOut(err => {
        if (err) {
            return next(err);
        }
        res.redirect('/login');
    });
  })
  
  function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
  }
  
  function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return res.redirect('/');
    }
    next();
  }
  
  app.listen(3000, () => console.log('Server started on http://localhost:3000'))
  