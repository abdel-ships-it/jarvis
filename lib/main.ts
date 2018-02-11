import * as TelegramBot from 'node-telegram-bot-api';
import { Email } from './email';
import { Gmail } from './gmail';
import { Rooms } from './rooms';

export class Main {

    private rooms: Rooms;
    
    private email: Email;
    
    private gmail: Gmail;

    constructor() {
        this.rooms = new Rooms();
    }
}