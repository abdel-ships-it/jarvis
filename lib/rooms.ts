import * as fetch from 'node-fetch';
import * as urlModule from 'url';
import { Response as FetchResponse } from 'node-fetch';
import * as puppeteer from 'puppeteer';
import * as http from 'http';
import admin from './room-db'
import { get, uniqBy } from 'lodash';


const RoomCredentials = JSON.parse(process.env['ROOM_CREDENTIALS']);

const END_POINT_URL = process.env['ROOM_WEBSITE_ENDPOINT'];

interface IResult {
    MessageList: any[];
    Adres: string;
    /** Region */
    PlaatsWijk: string;
    /** Description of the Appartement */
    Omschrijving: string;
    Aanbieder: string;
    Prijs: string;
    /** Room count */
    Kamers: string;
    AfbeeldingUrl: string;
    SoortWoning: any;
    Slaagkans: string;
    SlaagkansText: any;
    PublicatieEinddatum: string;
    PublicatieBegindatum: string;
    PublicatieEinddatumVolledig: string;
    PublicatieWachttijd: string;
    PublicatieBeschikbaarPer: string;
    IsToonTegels: boolean;
    Status: string;
    AantalReacties: any;
    VoorlopigePositie: any;
    AantalWoningen: any;
    AantalBeschikbaar: any;
    /** Unique id of publication */
    PublicatieId: number;
    ResterendetijdUur: number;
    ResterendetijdDagen: number;
    ShowResterendeTijd: boolean;
    ResterendeTijdMinderDanUur: boolean;
    AdvertentieUrl: string;
    MinimalePositie: number;
    ResultaatIndex: number;
    /** Url to advertisment is prefixed by end point url */
    PreviewUrl: string;
    Latitude: number;
    Longitude: number;
    MapsIcon: any;
    ToonMessageList: boolean;
    PublicatieModel: string;
    CurrentRegioCode: number;
    IconName: string;
    PrijsHelpText: string;
    IsNieuw: boolean;
    PublicatieModulesCode: string;
    RegioCode: string;
    PublicatieDetailModelCode: any;
    PublicatieDetailModel: string;
    IsKoop: boolean;
    IsHuur: boolean;
    IsVrijeSectorhuur: boolean;
    IsRos: boolean;
    IsOptie: boolean;
    IsLoting: boolean;
    IsGarage: boolean;
    IsTeWoon: boolean;
    WoningType: 2;
    WoningTypeCssClass: string;
    Samenvatting: string;
    Toegankelijkheidslabel: string;
    ToegankelijkheidslabelCssClass: string;
    ToegankelijkheidslabelHelpTekst: any;
    FlexibelhurenIndicatorCode: any;
    HasFlexibelhurenIndicator: boolean;
    FlexibelhurenIndicatorCssClass: string;
    FlexibelhurenIndicatorHelpTekst: any;
    ToonSlaagkans: boolean;
}

interface IRoomFindRespose {
    TotalSearchResults: number;
    Guid: string;
    Url: string;
    NoFilterInUrlLabel: string;
    Legenda: any[];
    Resultaten: IResult[]
    PredefinedFilters: any;
    IsGeautenticeerd: boolean;
    TabUitlegText: string;
    TabbladAanwezig: boolean;
    MapsSettings: any;
    ToonAantalReactiesEnActuelePositie: boolean;
    ToonSlaagkans: boolean;
    GebruikToegankelijkheidslabel: boolean;
    Filters: any;
}
/** Represents an apartament summary */
export interface IApartamentSummary {
    /** Location of the room */
    location: {
        latt: number;
        lang: number;
    }
    price: string;
    /** Url of said room */
    url: string;
    /** The region of this room */
    region: string;
    /** Amount of rooms */
    roomCount: number;
    /** Description of the apparement */
    description: string;
    /** End date of publication */
    endDate: string;
    /** Address of apartament */
    adress: string;
}

/**
 * This class will be responsible for updating the database with new aprataments, and the only method it will expose will be the method which is
 * responsible for returning new apartaments. Everything else including authentication, syncing initial apartaments will be kept internal
 * 
 * Detection of new apartament strategy will work a little bit like this. I will save a boolean under current_apartaments/:PublicatieId/
 * Every half hour, I will loop through the apartaments, and see if there is any new `PublicatieId`. Its also very important to do database cleaning.
 * We will do so by overrwriting the entirity of current_apartaments node once we have the differences we need.
 * 
 * Also for feature references we will save a IApartamentSummary in apartament_summary incase the bot fails to notify me about a new apartament or I want to notification scheduling
 */
export class Apartament {
    /** amounts of results that come back in a request */
    private readonly RESULTS_PER_REQUEST = 10;

    /** The room filter we will use to fetch apartaments */
    private readonly APARTAMENT_FILTER = 'soort[Zelfstandig]';

    constructor() { }

    /** 
     * Returns the latest new rooms
    */
    public async getNewApartaments(): Promise<IApartamentSummary[]> {

        /** A valid session id */
        const session_id = await this.getValidSessionId();        
        
        /** All the aparatements on the website right now */
        const apartaments = await this.fetchApartaments(session_id);
        
        /** All the saved aparatements */
        const savedAparatements = await this.getCurrentAaratementsIds();
        
        /** The new apartaments we found */
        const newAparatements = apartaments.filter( el => !savedAparatements.includes(el.PublicatieId.toString()) );

        /** A summarised apartament */
        const summarisedApartaments: IApartamentSummary[] = newAparatements.map( newAparatement => {
            const summarisedApartament: IApartamentSummary = {
                description: newAparatement.Omschrijving,
                endDate: newAparatement.PublicatieEinddatum,
                location : {
                    lang: newAparatement.Longitude,
                    latt: newAparatement.Latitude
                },
                price: newAparatement.Prijs,
                region: newAparatement.PlaatsWijk,
                roomCount: + newAparatement.Kamers,
                url: `${END_POINT_URL}/${newAparatement.PreviewUrl}`,
                adress: newAparatement.Adres
            }

            return summarisedApartament;
        });
        
        return summarisedApartaments;
    }


    /** Gets the last saved session id */
    private async getLastSavedSessionId() {
        const snapshot = await  admin.database().ref('/sessionId').once('value');

        return snapshot.val();
    }
    
    /** Saves the session id in the database */
    private async setLastSavedSessionId( sessionId: string ) {
        const insert = await admin.database().ref('/sessionId').set(sessionId);

        console.log('[set:session:id] saved session id in firebase', sessionId);

        return insert;
    }

    /** Returns a valid session id */
    private async getValidSessionId(): Promise<string> {
        // In this function, we will check the last stored session id. If its valid. We will return that
        // If its not valid, we will return a session id from login
        //
        console.log('[rooms:login:check] checking logged in state');

        const sessionId = await this.getLastSavedSessionId();

        // We will try to access a protected route and force the backend into throwing a 401 to validate our token
        //
        const response = await(fetch(`${END_POINT_URL}/webapi/InschrijfgegevensComponent/Data/`, {
            headers: {
                'Content-Type': 'application/json',
                'Cookie': [`ASP.NET_SessionId=${sessionId}`]
            }
        }) as Promise<Request>);

        /** Status of the response */
        const status = (response as FetchResponse).status;

        if ( status === 200 ) {
            console.log('[rooms:login:check] user is logged in ✅');
            return sessionId;
        } else {
            console.log(`[rooms:login:check] user is not logged ❌, status code ${status}`);
            return this.login();
        }
    }
    
    /** 
     * This will fetch all the aparatements
    */
    private async fetchApartaments(session_id: string): Promise<IResult[]> {
        let totalApartaments = await this.getTotalApartaments(session_id);

        /** Amount of trips we need to make to fetch all aparatements */
        const requiredRoundTrips = Math.ceil(totalApartaments / this.RESULTS_PER_REQUEST);

        console.log('[fetch-aparatements] total trips required ', requiredRoundTrips);

        const apartamentsRequests = Array(requiredRoundTrips).fill(null).map((_x, i) => {
            return this.fetchApartamentBatch(session_id, i + 1);
        });

        try { 
            /** 
             * Combining the power of promises and async/await, Promise.all will help us achieve maximum concurrency 
             * This variable will contain a nested array response of the found aparatements, we will flatten that later
             * */
            const nestedApartamentResponses = await Promise.all(apartamentsRequests);

            /** Flattened out aparatements, with some possible duplicates */
            const aparatementsWithDuplicates = nestedApartamentResponses.reduce((a, b) => a.concat(b), [])

            const aparatements = uniqBy(aparatementsWithDuplicates, 'PublicatieId');
    
            return aparatements;
        }
        catch (e) {
            console.error('[fetch-aparatements] error fetching aparatements', e);
        }
    }

    /** Returns the amount of apartaments with my filters are available */
    private async getTotalApartaments( session_id: string ): Promise<number> {
        console.log('[total-aparatements] calculating total aparatements');
        
        /** The body of this request */
        const requestBody = {
            url: `model[Regulier aanbod]~${this.APARTAMENT_FILTER}~predef[]`,
            // command: 'soort[+Zelfstandig]',
            hideunits: "hideunits[]"
        };

        // { "url": "model[Regulier aanbod]~soort[Zelfstandig]~predef[]", "command": "", "hideunits": "hideunits[]" }

        // { "url": "model[Regulier aanbod]~soort[Zelfstandig]~predef[]", "command": "soort[+Zelfstandig]", "hideunits": "hideunits[]" }
        // { url: 'model[Regulier aanbod]~soort[Zelfstandig]~predef[]', command: 'soort[+Zelfstandig]',    hideunits: 'hideunits[]' }

        console.log('[total-aparatements] request body', requestBody);

        // I could do a /QuickFind, but that would return me all available apartaments excluding my filter
        // So sadly I am kind of forced to do an extra tip to see how many apartaments are available
        // 
        const response = await this.preformApartamentsSearch(session_id, requestBody);
        
        /** Total found aparatements */
        const totalAparatements = response.TotalSearchResults;

        console.log('[total-aparatements] total aparatements', totalAparatements);
        
        return totalAparatements;
    }

    /** 
     * We will be fetching apartaments per batches of 10 
     * @param session_id {string} the session id of the current logged in user
     * @param pageNumber {number} which page number, starting at 0
    */
    private async fetchApartamentBatch(session_id: string, pageNumer: number): Promise<IResult[]> {
        /** Represents the default url */
        const defaultUrl = `model[Regulier aanbod]~${this.APARTAMENT_FILTER}~predef[]`;

        /** The url filter which we will use to fetch the apartament */
        let updatedUrl = this.createFilter(defaultUrl, 'page', pageNumer.toString() );

        console.log('[fetch-apartament-batch] fetching apartaments batch with following URL filter', updatedUrl);

        // We can fetch the second page in two ways, we will stick to using URL which works more consistent
        //
        // 1 - { "url": "model[Regulier aanbod]~soort[Zelfstandig]~predef[]", "command": "page[2]", "hideunits": "hideunits[]" }
        // 2 -{ "url": "model[Regulier aanbod]~soort[Zelfstandig]~page[2]~predef[]", "command": "", "hideunits": "hideunits[]" }
        //
        const response = await this.preformApartamentsSearch(session_id, {
            url: updatedUrl,
        });

        return response.Resultaten;
    }

    
    /** 
     * Creates a filter by respecting the websites filter format seperated by a tilde, This filter will be used in the URL prop of searches
     * @example 
     * With input curr = 'model[Regulier aanbod]' , key = 'page', value = 2
     * You would get output = model[Regulier aanbod]~page[2]
     */
    private createFilter( curr: string, key: string, value: string ) {
        return `${curr}~${key}[${value}]`;
    }

    /** Lowest level function to preform apartament searches */
    private async preformApartamentsSearch(session_id: string, body: any): Promise<IRoomFindRespose> {

        console.log('[preform-apartaments-search] searching with session id', session_id);

        const response = await (fetch(`${END_POINT_URL}/webapi/zoeken/find/`, {
            method: 'POST',
            body: JSON.stringify(body),
            headers: {
                'Content-Type': 'application/json; charset=UTF-8',
                'Cookie': [`ASP.NET_SessionId=${session_id}`],
            }
        }) as Promise<Request>)

        const data: IRoomFindRespose = await response.json();

        return data;
    }

    /** 
     * Loops through all apartaments and updates the database with known apartaments
     * We probably only have to do this the first time this application is executed. But we might need it in the future in case we purge
     * all the apartaments in the database
     */
    private async syncSavedApartaments() {

        try {
            // First of all,we need a valid session id
            // 
            const session_id = await this.getValidSessionId();

            const apartaments = await this.fetchApartaments(session_id);


            const data = apartaments.map(aparatement => aparatement.PublicatieId);

            admin.database().ref('/current_apartaments').set( data );
        } catch (e) {
            console.error('[syncing:aparatements] error syncing aparatements', e);
        }   
    }

    /** 
     * Returns the ids of the current saved aparatements
    */
    private async getCurrentAaratementsIds(): Promise<string[]> {
        const snapshot = await admin.database().ref('/current_apartaments').once('value');

        return snapshot.val();
    }

    /** 
     * Logs in the website
     * and returns a session id (ASP.NET_SessionId)
     * Also will save the session id in the database
     */
    private async login(): Promise<string> {
        try { 
            const browser = await puppeteer.launch();
            const page = await browser.newPage();
            await page.goto(`${END_POINT_URL}/nl-NL/Inloggen`);
        
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

            console.log('[aparatements:login] cookies after login ', cookies);

            const session_id = cookies.find(el => el.name === 'ASP.NET_SessionId').value;

            await browser.close();

            await this.setLastSavedSessionId(session_id);

            return session_id; 
        }
        catch(e) {
            console.error('[aparatements:login] error logging in', e);
        }
    }
}