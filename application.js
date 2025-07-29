const express = require('express');
const mysql = require('mysql2');
const flash = require('connect-flash');
const multer = require('multer');
const app = express();
// for bootstrap - layout.ejs
const expressLayouts = require('express-ejs-layouts');
app.use(expressLayouts);
app.set('layout', 'layout'); // tells EJS to use layout.ejs by default

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images'); // Directory to save uploaded files
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname); 
    }
});

const upload = multer({ storage: storage });

const db = mysql.createConnection({
    host: '4i4ghe.h.filess.io',
    user: 'C237CA2_filmtentgo',
    port:3307,
    password: '7a4f403d4166ed9ff99438cf9da5ce2a82ae053f',
    database: 'C237CA2_filmtentgo'
  });

db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// Set up view engine
app.set('view engine', 'ejs');
//  enable static files
app.use(express.static('public'));
// enable form processing
app.use(express.urlencoded({
    extended: true
}));
app.use(express.json()); // Enable JSON parsing



// Beginning of orginal code
const session = require('express-session'); // Importing express-session for session management

app.use(session({ // Setting up session middleware
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
    cookie: {maxAge: 1000 * 60 * 60 * 24 * 7}
}));

app.use((req, res, next) => {
    res.locals.user = req.session.user;
    next();
});

// Use of flash
app.use(flash());

// Middleware (Line 60 - 160)

const checkSameNameOrEmail = (req, res, next) => {
    const { username, email } = req.body;
    const checkusernameSql = 'SELECT * FROM users WHERE username = ? OR email = ?';
    db.query(checkusernameSql, [username, email], (err, results) => {
        if (err) {
            throw err;
        }
        if (results.length > 0) {
            req.flash('error', 'Username or email already exists.');
            req.flash('formData', req.body);
            return res.redirect('/register');
        }
        next();
    });
};

const validateRegistration = (req, res, next) => { // Middleware to validate registration form data
    const { username, email, password, address, contact } = req.body;

    if (!username || !email || !password || !address || !contact) {
        return res.status(400).send('All fields are required.');
    }
    
    if (password.length < 6) {
        req.flash('error', 'Password should be at least 6 or more characters long');
        req.flash('formData', req.body);
        return res.redirect('/register');
    }
    next();
};
// Check authentication middleware
const checkAuthenticated = (req, res, next)=>{
    if (req.session.user) {	// check if session.user is set
        return next();
    } else {
        req.flash('error', 'Pls log in to view this resource');
        res.redirect('/login');  // change url to /login and load the page, will call code of app.get('/login', (req, res)..
    }
};

// Check admin middleware
const checkAdmin = (req, res, next) => {
    if (req.session.user.role === "admin"){ // check if session.user role variable is admin
        return next();
    }else {
        req.flash('error', 'Access denied');	// flash to variable: error
        res.redirect('/jobs');  // change url to /jobs and load the page, will call code of app.get('/jobs', ..
    }
};

const checkEmployer = (req, res, next) => {
    if (req.session.user.role === "employer"){ // check if session.user role variable is admin
        return next();
    }else {
        req.flash('error', 'Access denied');	// flash to variable: error
        res.redirect('/jobs');  // change url to /jobs and load the page, will call code of app.get('/jobs', ..
    }
};

const checkjobedit = (req, res, next) => {
    const jobId = req.params.id;
    const sql = "SELECT username FROM jobs WHERE jobId = ?"

    db.query(sql, [jobId], (err, results) => {
        if (err) {
            console.error(err);
            req.flash('error', 'Database error');
            res.redirect('/jobs');
        } else if (results.length === 0) {
            req.flash('error', 'Job not found');
            res.redirect('/jobs');
        } else {
            const jobCreator = results[0].username;

            if (req.session.user.username === jobCreator || req.session.user.role === "admin") { // check if user created the job or is admin
                return next();
            } else {
                req.flash('error', 'Access denied');   
                res.redirect('/jobs');
            }
        }
    });
};

const checkuseredit = (req, res, next) => {
    if (req.session.user.id === req.params.userId || req.session.user.role === "admin"){ // check if session.user role variable is admin/employer
        return next();
    }else {
        req.flash('error', 'Access denied');    // flash to variable: error
        res.redirect('/jobs');  // change url to /editJob and load the page, will call code of app.get('/jobs', ..
    }
};

app.get('/', (req, res) => {
    res.render('index', { user: req.session.user, messages: req.flash('success')});
});

app.get('/register', (req, res) => {
    res.render('register', { messages: req.flash('error'), formData: req.flash('formData')[0] });
});


// Login & Signup Route - Chong Shun

app.post('/register', upload.single('userImage'), checkSameNameOrEmail, validateRegistration, (req, res) => { //upload.single('image') is used to handle single file uploads and must be placed first to parse the req.body to be used. the 'image' inside upload.single('image') is the name of the file input in the HTML form.
    const { username, email, password, address, contact, role, adminpass, securityQuestion, securityAnswer } = req.body;
    let userImage;
    if (req.file) {
        userImage = req.file.filename; //Save only the filename
    } else {
        userImage = null;
    }

    const insertUser = () => {
        const sql = 'INSERT INTO users (username, email, password, address, contact, role, securityQuestion, securityAnswer, userImage) VALUES (?, ?, SHA1(?), ?, ?, ?, ?, ?, ?)';
        db.query(sql, [username, email, password, address, contact, role, securityQuestion, securityAnswer, userImage], (err, result) => {
            if (err) {
                throw err;
            }
            console.log(result);
            req.flash('success', 'Registration successful! Please log in.');
            res.redirect('/login');
        });
    };

    if (role === 'admin') {
        const getadminpasssql = 'SELECT * from role WHERE role_name = ? AND password = ?';
        db.query(getadminpasssql, [role, adminpass], (err, results) => {
            if (err) {
                throw err;
            }
            if (results.length > 0) {
                req.flash('success', 'Admin registration successful!');
                insertUser();
            } else {
                req.flash('error', 'Invalid admin password.');
                req.flash('formData', req.body);
                return res.redirect('/register'); // Only one redirect
            }
        });
    } else {
        insertUser(); // Non-admin path
    }
});

app.get('/reset-password', (req, res) => {
    res.render('reset-password', {
        messages: req.flash('error'),
        question: req.flash('question'),
        username: req.flash('username')
    });
});

app.post('/reset-password', (req, res) => {
    const { username, securityAnswer, newPassword } = req.body;
    const sql = 'SELECT * FROM users WHERE username = ? AND security_answer = ?';
    if (username && securityAnswer && newPassword) {
        if (newPassword.length < 6) {
            req.flash('error', 'Password should be at least 6 or more characters long');
            req.flash('formData', req.body);
            return res.redirect('/reset-password');
        }
        db.query(sql, [username, securityAnswer], (err, results) => {
            if (err) {
                throw err;
            }

            if (results.length > 0) {
                const updateSql = 'UPDATE users SET password = SHA1(?) WHERE username = ?';
                db.query(updateSql, [newPassword, username], (err, updateResult) => {
                    if (err) {
                        throw err;
                    }
                    req.flash('success', 'Password reset successful! Please log in.');
                    res.redirect('/login');
                });
            } else {
                req.flash('error', 'Invalid username or security answer.');
                res.redirect('/reset-password');
            }
        });
    }
    else if (username) { // If only username is provided, fetch the security question
        const questionsql = 'SELECT * FROM users WHERE username = ?';
        db.query(questionsql, [username], (err, results) => {
            if (err) {
                throw err;
            }

            if (results.length > 0) {
                req.flash('question', results[0].security_question);
                req.flash('username', username);
                res.redirect('/reset-password');
            } else {
                req.flash('error', 'Username not found.');
                res.redirect('/reset-password');
            }
        });
    }
    else {
        req.flash('error', 'All fields are required.');
        res.redirect('/reset-password');
    }
});

app.get('/login', (req, res) => {
    res.render('login', {
        messages: req.flash('success'),
        errors: req.flash('error')
    });
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;

    // Validate email and password
    if (!email || !password) {
        req.flash('error', 'All fields are required.');
        return res.redirect('/login');
    }

    const sql = 'SELECT * FROM users WHERE email = ? AND password = SHA1(?)';
    db.query(sql, [email, password], (err, results) => {
        if (err) {
            throw err;
        }

        if (results.length > 0) {
            // Successful login
            req.session.user = results[0]; // store user in session
            req.flash('success', 'Login successful!');
            //******** TO DO: Update to redirect users to /jobs route upon successful log in ********//
            res.redirect('/jobs');
        } else {
            // Invalid credentials
            req.flash('error', 'Invalid email or password.');
            res.redirect('/login');
        }
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Create Route - Eunice

app.get('/jobs/create', checkAuthenticated, checkEmployer, (req, res) => {
    res.render('createJob', { user: req.session.user, messages: req.flash('error'), formData: req.flash('formData')[0] });
});

app.post('/jobs/create', checkAuthenticated, checkEmployer, (req, res) => {
    const { position, location, pay_per_hour, jobNature, description, jobname } = req.body;
    if (!position || !location || !pay_per_hour || !jobNature || !description || !jobname) {
        req.flash('error', 'All fields are required.');
        return res.redirect('/jobs/create');
    }
    const sql = 'INSERT INTO jobs (position, location, pay_per_hour, jobNature, description, jobname, username) VALUES (?, ?, ?, ?, ?, ?, ?)';
    db.query(sql, [position, location, pay_per_hour, jobNature, description, jobname, req.session.user.username], (err, result) => {
        if (err) {
            req.flash('error', 'Error creating job.');
            return res.redirect('/jobs/create');
        }
        req.flash('success', 'Job created successfully!');
        res.redirect('/jobs');
    });
});

// View Route - Jisha



app.get('/employer/jobs', checkAuthenticated, checkEmployer, (req, res) => {
    const employerName = req.session.user.username;
    const sql = 'SELECT * FROM jobs WHERE username = ?';
    db.query(sql, [employerName], (err, results) => {
        if (err) {
            console.error('Error fetching employer jobs:', err);
            return res.status(500).send('Error fetching jobs');
        }
        res.render('employer_jobs', { jobs: results, user: req.session.user });
    });
});

// View all freelance job listings
app.get('/jobs', checkAuthenticated,(req, res) => {
    const { position, location, search } = req.query;
    let sql = 'SELECT * FROM jobs WHERE 1=1';
    let params = [];

    if (position) {
        sql += ' AND position = ?';
        params.push(position);
    }
    if (location) {
        sql += ' AND location = ?';
        params.push(location);
    }
    if (search) {
        sql += ' AND (jobname LIKE ? OR description LIKE ? OR position LIKE ? OR location LIKE?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const posSql = 'SELECT DISTINCT position FROM jobs';
    const locSql = 'SELECT DISTINCT location FROM jobs';

    db.query(sql, params, (err, jobs) => {
        if (err) throw err;
        db.query(posSql, (err, position) => {
            if (err) throw err;
            db.query(locSql, (err, location) => {
                if (err) throw err;
                res.render('jobs', {
                    jobs,
                    position: position,
                    location: location,
                    search
                });
            });
        });
    });
});

// View job details by job ID
app.get('/jobs/:id', checkAuthenticated,(req, res) => {
    const jobId = req.params.id;
    const query = 'SELECT * FROM jobs WHERE jobId = ?';
    db.query(query, [jobId], (err, results) => {
        if (err) throw err;
        if (results.length === 0) return res.status(404).send('Job not found');
        res.render('job_detail', { job: results[0], user: req.session.user });
    });
});

// View the user's job applications lol
app.get('/applications', checkAuthenticated, (req, res) => {
    const userId = req.session.user.user_id;
    const query = 'SELECT * FROM jobs WHERE applicant_id = ?';
    db.query(query, [userId], (err, results) => {
        if (err) throw err;
        res.render('applications', { jobs: results, user: req.session.user });
    });
});


// View user's profile
app.get('/profile/:id', checkAuthenticated, (req, res) => {
    const userId = req.params.id;
    const query = 'SELECT * FROM users WHERE userId = ?';
    db.query(query, [userId], (err, results) => {
        if (err) throw err;
        res.render('profile', { userInfo: results[0], user: req.session.user });
    });
});

// Admin gets to view all users // Can put as value in navbar
app.get('/admin/users', checkAuthenticated, checkAdmin, (req, res) => {
    const query = 'SELECT * FROM users';
    db.query(query, (err, results) => {
        if (err) throw err;
        res.render('adminviewuser', { users: results, user: req.session.user });
    });
});

// Admin gets to view all job posts
app.get('/admin/jobs', checkAuthenticated, checkAdmin, (req, res) => {
    const query = 'SELECT * FROM jobs';
    db.query(query, (err, results) => {
        if (err) throw err;
        res.render('admin_jobs', { jobs: results, user: req.session.user });
    });
});


// Edit Route - Yong Jun

app.get('/editJob/:id', checkAuthenticated, checkjobedit, (req, res) => {
    const jobId = req.params.id;
    const sql = 'SELECT * FROM jobs WHERE jobId = ?';
    db.query(sql, [jobId], (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error retrieving job by ID');
        }
        if (results.length > 0) {
            res.render('editJob', {jobs: results[0], user: req.session.user});
        } else {
            res.status(404).send('job not found');
        }
    });
});

app.get('/editUser/:id', checkAuthenticated, checkjobedit, (req, res) => {
    const userId = req.params.id;
    const sql = 'SELECT * FROM users WHERE userId = ?';
    db.query(sql, [userId], (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error retrieving user by ID');
        }
        if (results.length > 0) {
            res.render('editUser', {user: results[0]});
        } else {
            res.status(404).send('user not found');
        }
    });
});

app.post('/editJob/:id', checkAuthenticated, checkjobedit, (req, res) => {
    const jobId = req.params.id;
    const {jobname, jobNature, pay_per_hour, position, location, description, username} = req.body;
    const sql = 'UPDATE jobs SET jobname = ?, jobNature = ?, pay_per_hour = ?, position = ?, location = ?, description = ?, username = ?  WHERE jobId = ?';

    db.query(sql, [jobname, jobNature, pay_per_hour, position, location, description, username, jobId], (error, results) => {
        if (error) {
            console.error('Error updating job:', error);
            return res.status(500).send('Error updating job');
        } else {
            res.redirect('/');
        }
    });
});

app.post('/editUser/:id', upload.single('image'), checkAuthenticated, (req, res) => {
    const userId = req.params.id;
    const {password, address, contact, securityQuestion, securityAnswer} = req.body;
    let userImage = req.body.currentImage;
    if (req.file) {
        userImage = req.file.filename;
        const sql = 'UPDATE users SET password = ? , address = ? , contact = ? , securityQuestion = ? , securityAnswer = ? , userImage = ? WHERE userId = ?';

        db.query(sql, [password, address, contact, securityQuestion, securityAnswer, userImage, userId], (error, results) => {
        if (error) {
            console.error('Error updating user:', error);
            return res.status(500).send('Error updating user');
        } else {
            res.redirect('/jobs');
        }
    });
    } else {
        const sql = 'UPDATE users SET password = ? , address = ? , contact = ? , securityQuestion = ? , securityAnswer = ? WHERE userId = ?';
        
        db.query(sql, [password, address, contact, securityQuestion, securityAnswer, userId], (error, results) => {
            if (error) {
            console.error('Error updating user:', error);
            return res.status(500).send('Error updating user');
            } else {
            res.redirect('/jobs');
            }
        });
    }});


// Delete Route - Anastasia

app.get('/deleteUsers/:id', checkAuthenticated, checkAdmin, (req,res) => {
    const userId = req.params.id;
    const sql = 'DELETE FROM users WHERE userId = ?';
    // Fetch data from MySQL based on the user ID
    db.query(sql, [userId], (error, results) => {
        if (error) {
            console.error('Error deleting user:', error);
            return res.status(500).send('Error deleting user');
        } else {
            // Send a success response
            res.redirect('/admin/users');
        }
    });
});

app.get('/deleteJobs/:id', checkAuthenticated, checkjobedit, (req,res) => {
    const jobId = req.params.id;
    const sql = 'DELETE FROM jobs WHERE jobId = ?';
    // Fetch data from MySQL based on the job ID
    db.query(sql, [jobId], (error, results) => {
        if (error) {
            console.error('Error deleting job:', error);
            return res.status(500).send('Error deleting job');
        } else {
            // Send a success response
            res.redirect('/employer/jobs');
        }
    });
});

// Search/Filter Route - Shahrul

// Search route

app.get('search', checkAuthenticated, (req, res) => {
    const searchTerm = req.query.q;
    const sql = "SELECT * FROM (tablename) WHERE (columnname) LIKE ? OR ...";
    db.query(sql, [`%${searchTerm}%`, `%${searchTerm}`], (err, results) => {
        if (err) throw err;
        res.render('dashboard', {user: req.session.user, tablename: results});
    
    });
});

const PORT = process.env.PORT || 3000;
app.listen(3000, () => {
    console.log(`Server started on http://localhost:${PORT}`);
});