import * as nodemailer from 'nodemailer'

export class Email {
    private transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        secure: true,
        port: 465,
        auth: {
            user: 'mailserverbabysitting@gmail.com',
            pass: "qejX8wdqvnPw248AVSfP"
        }
    });;

    constructor() { }

    public send( email: string , address: string ) {
        return this.transporter.sendMail({
            from: {
                name: 'Appie',
                address: 'abdelelmedny@gmail.com'
            },
            to: address,
            html: email,
            subject: 'Jarvis registeration'
        });
    }
}