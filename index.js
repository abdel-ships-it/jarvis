require('ts-node/register');

const Main = require('./lib/main').Main;

const main = new Main();

var AirbrakeClient = require('airbrake-js');

var airbrake = new AirbrakeClient({
    projectId: 195863,
    projectKey: '0f0293169f9fadde37747fa569b6694d'
});
