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

        // For more information on cron jobs, visit this useful link
        // https://crontab.guru/#1_0_*_*_*
        //
        schedule.scheduleJob('*/30 * * * *',  () => {
            console.log('Running job...');
            this.rooms.getNewApartaments().then(apartaments => {
                console.log('Found new apartament');
                apartaments.forEach(apartament => this.bot.sendApartamentSummary(apartament));
            });
        });
    }
}