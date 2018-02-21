import * as TelegramBot from 'node-telegram-bot-api';
import { IApartamentSummary, Apartament } from './rooms';

/** Telegram bot token */
const token = process.env['TELEGRAM_BOT_TOKEN'];

export class Bot {

    private botInstance: TelegramBot;

    /** Telegram account ids of those who are interested in the bots content */
    private readonly RECEIVER_IDS = [21352993];

    constructor() { 
        console.log('token is', token);

        this.botInstance = new TelegramBot(token);

        this.botInstance.onText(/\/debug/, msg => {
            this.botInstance.sendMessage(msg.chat.id, JSON.stringify(msg, null, 4));
        });
    }

    /** Sends a report summary via telegram */
    public sendApartamentSummary( apartament: IApartamentSummary  ): Promise<any> {

        const promises: Promise<any>[] = [];

        this.RECEIVER_IDS.forEach( id => {
            const { latt, lang } = apartament.location;

            const venuePromise = this.botInstance.sendVenue(id, latt, lang, apartament.price, apartament.adress);

            const messagePromise = this.botInstance.sendMessage(id, `${apartament.description} [hier](${apartament.url}`, {
                parse_mode: 'Markdown'
            });

            promises.push(venuePromise, messagePromise);
        });

        return Promise.all(promises);
    }

    public sendMessage(message): void {
        this.RECEIVER_IDS.forEach( id => {
            this.botInstance.sendMessage(id, message, {
                disable_notification: true
            });
        });
    } 
}