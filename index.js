const express = require('express');
const fs = require('fs');
const app = express();
const axios = require('axios');
var timeout = require('connect-timeout');

const AUTH_GRANT_TYPE = "password"
const AUTH_USERNAME = "humanumlmo"
const AUTH_SECRET = "9mFcDN7OMaYI9Oy3pZV="

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "http://localhost:3000");
    res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, access-control-allow-origin, Content-Type, Accept, Authorization, Content-Type");
    next();
});

app.use(timeout(120000));
app.use(haltOnTimedout);

function haltOnTimedout(req, res, next) {
    if (!req.timedout) next();
}

app.get('/baptisteries-cache', (req, res, next) => {
    try {
        const baptisteries = JSON.parse(fs.readFileSync('./cache/baptisteries.json'))
        res.send(baptisteries, '', 4)
    } catch (e) {
        res.send(`Error while fetching data from cache: ${e}`);
    }
    updateData()
});

app.get('/baptisteries-update', (req, res, next) => {
    updateData()
        .then(data => res.send(data))
        .catch(e => res.send({
            status: "error",
            message: e
        }))
});

app.listen(3003, () => console.log('Baptisteries server now running on port 3003!'));

const getBearerToken = () => {
    const credentials = `grant_type=${AUTH_GRANT_TYPE}&username=${AUTH_USERNAME}&password=${AUTH_SECRET}`;
    return new Promise((resolve, reject) => {
        axios.post('https://www.luciaorlandi.it/Token', credentials).then(res => {
            resolve(res.data.access_token);
        }).catch(e => {
            reject(`error while obtaining access token: ${e}`);
        });
    });
}

const headData = (token) => {
    return new Promise((resolve, reject) => {
        axios.head('https://www.luciaorlandi.it/api/baptset', { headers: { 'Authorization': `Bearer ${token}` } }
        ).then(res => {
            resolve(res.headers['last-modified']);
        }).catch(e => {
            reject(`error while obtaining access token: ${e}`);
        });
    });
}

const getData = (token) => {
    return new Promise((resolve, reject) => {
        axios.get('https://www.luciaorlandi.it/api/baptset', { headers: { 'Authorization': `Bearer ${token}` } }
        ).then(res => {
            resolve(res.data);
        }).catch(e => {
            reject(`error while obtaining access token: ${e}`);
        });
    });
}

// check if cache is up to date, update it if not
const updateData = async () => {

    // get api token
    token = await getBearerToken()

    // get server last update date
    lastUpdateDate = Date.parse(await headData(token))

    // check if client last update date < actual server update date
    if (JSON.parse(fs.readFileSync('./cache/logs.json')).lastUpdate.pop() < lastUpdateDate) {

        // get last data
        console.log('updating cache data')
        data = await getData(token)

        // write cache file
        fs.writeFileSync('./cache/baptisteries.json', JSON.stringify(data, '', 4))

        // update date
        const logs = JSON.parse(fs.readFileSync('./cache/logs.json'))
        logs.lastUpdate.push(Date.now().toString())
        fs.writeFileSync('./cache/logs.json', JSON.stringify(logs, '', 4))

        return {
            status: "update",
            data
        }
    }

    return {
        status: "upToDate"
    }
}