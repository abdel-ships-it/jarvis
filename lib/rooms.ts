import * as fetch from 'node-fetch';
import * as puppeteer from 'puppeteer';
import * as http from 'http';
const RoomCredentials = require('../.secret/room-credentials.json');

export class Rooms {
    /** amounts of results that come back in a request */
    private readonly RESULTS_PER_REQUEST = 10;


    constructor() {
        // this.login()
        Promise.resolve('ccqm2du2pktlh0n3ksdhnmzk')
            .then( sessionId => {
                return fetch('https://www.studentenwoningweb.nl/webapi/zoeken/find/', { method: 'POST', headers: {
                    'Cookie': [`ASP.NET_SessionId=${sessionId}`]
                }, body: {
                    command: "page[1]"
                } })
            })
            .then(res => res.json())
            .then(res => {
                console.log('find', res.TotalSearchResults);
            });

        setTimeout(() => {}, 10000);

    }

    /** 
     * Logs in the website
     * and returns a session id (ASP.NET_SessionId)
     */
    public async login(): Promise<string> {
        console.log('[rooms:login] starting to login');

        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto('https://www.studentenwoningweb.nl/nl-NL/Inloggen');
    
        // Filling in the form
        //
        await page.type('#gebruikersnaam', `${RoomCredentials.username}`);
        await page.type('#password', RoomCredentials.password);

        // Submitting the form
        //
        const form = await page.$('form#inloggenForm');
        await page.evaluate(formEl => formEl.submit(), form);
        await form.dispose();

        // Waiting for navigation
        // @see https://stackoverflow.com/questions/46948489/puppeteer-wait-page-load-after-form-submit
        // 
        await page.waitForNavigation();

        const cookies = await page.cookies();

        console.log('[rooms:login] cookies after login ', cookies);

        const sessionId = cookies.find(el => el.name === 'ASP.NET_SessionId').value;

        await browser.close();

        return sessionId;
    }

    sendRequest(sessionId: string) {
        var options: http.RequestOptions = {
            hostname: 'www.studentenwoningweb.nl',
            path: '/webapi/zoeken/find/',
            method: 'POST',
            headers: { 'Cookie': `ASP.NET_SessionId=${sessionId}`, 'Content-Type': 'application/json; charset=UTF-8' },
            
        };
        var results = '';
        var req = http.request(options, function (res) {
            res.on('data', function (chunk) {
                results = results + chunk;
                //TODO
                console.log('chunk', chunk.toString())
            });
            res.on('end', function () {
                //TODO
            });
        });

        req.on('error', function (e) {
            console.error(e);
        });

        req.end();

        
    }
}