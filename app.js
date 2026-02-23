if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const engine = require('ejs-mate');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const methodOverride = require('method-override');
const LocalStrategy = require('passport-local');
const Admin = require('./models/Admin'); 
const deleteRoute = require("./routes/del");

// --- 1. Database Connection (Do this early) ---
const dbURI = process.env.MONGO_URI || process.env.ATLAS_URL || "mongodb://127.0.0.1:27017/schoolDB";
mongoose.connect(dbURI)
    .then(() => console.log("✅ MongoDB Connected Successfully"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

// --- 2. View Engine & Static Assets ---
app.engine('ejs', engine);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

// --- 3. Body Parsers (Must be before routes/sessions) ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- 4. Session & Flash Setup ---
const sessionOptions = {
    secret: process.env.SESSION_SECRET || process.env.SECRET || "TUISAdminSecretKey", // TUIS specific secret
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000, 
        maxAge: 7 * 24 * 60 * 60 * 1000,
    }
};

app.use(session(sessionOptions));
app.use(flash());

// --- 5. Passport Config (Crucial Order) ---
app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride('_method')); 

passport.use(new LocalStrategy(Admin.authenticate()));
passport.serializeUser(Admin.serializeUser());
passport.deserializeUser(Admin.deserializeUser());

// --- 6. Global Variables Middleware ---
app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user; // Used for dynamic Navbars
    next();
});

// --- 7. Route Handling ---
const publicRoutes = require("./routes/publicRoutes");
const adminRoutes = require("./routes/adminRoutes");

app.use("/", publicRoutes);
app.use("/admin", adminRoutes);
app.use("/d", deleteRoute); // Added the delete route here

// --- 8. Error Handling (The Safety Net) ---
app.use((req, res) => {
    res.status(404).render("404", { title: "Page Not Found" });
});

app.use((err, req, res, next) => {
    const { statusCode = 500 } = err;
    if (!err.message) err.message = "Something Went Wrong!";

    // If it's an AJAX/Fetch request (like your forms), send JSON
    if (req.xhr || (req.headers.accept && req.headers.accept.includes('json'))) {
        return res.status(statusCode).json({ message: err.message });
    }
    
    // Otherwise, render an error page
    res.status(statusCode).render("404", { err }); 
});

// --- 9. Start Server ---
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});