import * as TelegramBot from 'node-telegram-bot-api';
import { Email } from './email';
import { Gmail } from './gmail';
import { Apartament } from './rooms';
import * as schedule from 'node-schedule';
import { Bot } from './bot';

export class Main {

    private rooms: Apartament;
    
    private email: Email;
    
    private gmail: Gmail;

    private bot: Bot;

    constructor() {
        this.rooms = new Apartament();

        this.bot = new Bot();

        this.bot.sendMessage('Server running');

        this.fetchApartamentsAndSendMessage()

        // For more information on cron jobs, visit this useful link
        // https://crontab.guru/#1_0_*_*_*
        //
        schedule.scheduleJob('*/30 * * * *',  () => {
            this.fetchApartamentsAndSendMessage()
        });
    }

    fetchApartamentsAndSendMessage() {
        this.rooms.getNewApartaments().then(apartaments => {
            apartaments.forEach( (apartament, index) => {
                setTimeout(() => {
                    this.bot.sendApartamentSummary(apartament)
                }, index * 3000);
            });
        });
    }
}