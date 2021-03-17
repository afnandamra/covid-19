'use strict';

require('dotenv').config();

const express = require('express');
const app = express();

const superagent = require('superagent');
const cors = require('cors');
const methodOverride = require('method-override');
const expressLayouts = require('express-ejs-layouts');

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static('./public'));
app.set('view engine', 'ejs');
app.use(expressLayouts);

const pg = require('pg');
// const client = new pg.Client(process.env.DATABASE_URL);
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// --------------- //

// Routes:
app.get('/', homeRoute);
app.get('/getCountryResult', getCountryResult);
app.get('/allCountries', allCountries);
app.post('/records', recordAdd);
app.get('/records', recordRender)
app.get('/details/:id', detailRender);
app.delete('/details/:id', detailDelete)


// Functions:
function homeRoute(req, res) {
    let url = `https://api.covid19api.com/world/total`;
    superagent(url)
        .then(result => {
            res.render('pages/index', { world: result.body })
        })
}

function getCountryResult(req, res) {
    let { country, from, to } = req.query;
    let url = `https://api.covid19api.com/country/${country}/status/confirmed?from=${from}T00:00:00Z&to=${to}T00:00:00Z`;
    superagent(url)
        .then(result => {
            let statArr = result.body.map(day => new Stat(day));
            res.render('pages/getCountryResult', { days: statArr })
        })
}

function allCountries(req, res) {
    let url = `https://api.covid19api.com/summary`;
    superagent(url)
        .then(result => {
            let allCountries = result.body.Countries.map(country => new Country(country));
            res.render('pages/allCountries', { countries: allCountries });
        })
}

function recordAdd(req, res) {
    let { country, totalconfirmed, totaldeaths, totalrecovered, date } = req.body;
    let SQL = `INSERT INTO covid (country, totalconfirmed, totaldeaths, totalrecovered, date) VALUES ($1,$2, $3, $4, $5);`;
    let values = [country, totalconfirmed, totaldeaths, totalrecovered, date];
    client.query(SQL, values)
        .then(() => {
            res.redirect('/records');
        })
}

function recordRender(req, res) {
    let SQL = `SELECT * FROM covid;`;
    client.query(SQL)
        .then(result => {
            res.render('pages/records', { countries: result.rows });
        })
}

function detailRender(req, res) {
    let SQL = `SELECT * FROM covid WHERE id=${req.params.id};`;
    client.query(SQL)
        .then(result => {
            res.render('pages/details', { country: result.rows[0] });
        })
}

function detailDelete(req, res) {
    let SQL = `DELETE FROM covid WHERE id=$1;`;
    let values = [req.params.id];
    client.query(SQL, values)
        .then(() => {
            res.redirect('/records');
        })
}


// Constructors
function Stat(data) {
    this.country = data.Country;
    this.cases = data.Cases;
    this.date = data.Date.slice(0, 10);
}

function Country(data) {
    this.country = data.Country;
    this.totalconfirmed = data.TotalConfirmed;
    this.totaldeaths = data.TotalDeaths;
    this.totalrecovered = data.TotalRecovered;
    this.date = data.Date.slice(0, 10);
}


// --------------- //

const PORT = process.env.PORT || 4040;

client.connect()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Listening on: http://localhost:${PORT}/`);
        })
    })