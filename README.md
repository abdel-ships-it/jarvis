# Jarvis

This is my personal assistant. It will help me with personal nifty things like. Forwarding e-mails I care about via telegram.

Or message me about the newest added apartaments in my area. You can use the source code for inspiration to build a telegram bot yourself! 
But most of it is tailored for me.

## Development

You need to populate the `.env` file locally via `heroku config --app=my-jarvis >> .env`
This has the default notation of `KEY:VALUE` but `heroku local` reads it as `KEY=VALUE` so make sure you change the files format.

You need heroku cli to ensure `.env` file gets loaded in. For development simply use `npm run start`