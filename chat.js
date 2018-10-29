#!/usr/bin / env node

const puppeteer = require('puppeteer');
const notifier = require('node-notifier');
const chalk = require('chalk');
const winston = require('winston');
const fs = require('fs');
const boxen = require('boxen');
const gradient = require('gradient-string');
const logSymbols = require('log-symbols');
const ansiEscapes = require('ansi-escapes');
const path = require('path');

const config = require('./config.js');
const selector = require('./selector.js');

process.setMaxListeners(0);

// make sure they specified user to chat with
if (!process.argv[2]) {
  console.log(logSymbols.error, chalk.red('User argument not specified, exiting...'));
  process.exit(1);
}

/////////////////////////////////////////////
// get user from command line argument
let user = '';

// because a username can contain first and last name/spaces, etc
for (let i = 2; i <=5; i++) {
  if (typeof process.argv[i] !== 'undefined') {
    user += process.argv[i] + ' ';
  }  
}

user = user.trim();
/////////////////////////////////////////////

// catch un-handled promise errors
process.on("unhandledRejection", (reason, p) => {
  console.warn("Unhandled Rejection at: Promise", p, "reason:", reason);
});

(async function main() {

  const logger = setUpLogging();

  try {

    print(boxen('Whatspup', {
      padding: 1,
      borderStyle: 'double',
      borderColor: 'green',
      backgroundColor: 'green'
    }));

    // custom vars ///////////////////////////////
    let last_received_message = '';
    let last_received_message_other_user = '';
    let last_sent_message_interval = null;
    let last_new_message_interval = null;
    let sentMessages = [];
    let newMessages = [];
    //////////////////////////////////////////////    

    const networkIdleTimeout = 30000;
    const stdin = process.stdin;
    const stdout = process.stdout;
    const headless = !config.window;

    const browser = await puppeteer.launch({
      headless: headless,
      //userDataDir: config.data_dir,
      args: [
		`--user-data-dir=${path.resolve(__dirname, config.data_dir)}`,
        '--disable-infobars',
        '--window-position=0,0',
        '--ignore-certificate-errors',
        '--ignore-certificate-errors-spki-list'
      ]
    });

    const page = await browser.newPage();

    // set user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3264.0 Safari/537.36');

    print(gradient.rainbow('Initializing...\n'));

    page.goto('https://web.whatsapp.com/', { waitUntil: 'networkidle2', timeout: 0 }).then(async function (response) {

      await page.waitFor(networkIdleTimeout);

      //debug(page);

      startChat(user);

      readCommands();
    })

    // allow user to type on console and read it
    function readCommands() {
      stdin.resume();
      
      stdin.on('data', function (data) {
        let message = data.toString().trim();

        // check for command "--chat UserName" to start new chat with that user
        if (message.toLowerCase().indexOf('--chat') > -1) {
          let new_user = message.split(" ").slice(1).join(" ");

          if (new_user) {
            startChat(new_user);
            user = new_user;
          }
          else {
            console.log(logSymbols.error, chalk.red('user name not specified!'));
          }
        }
        // clear chat screen
        else if (message.toLowerCase().indexOf('--clear') > -1) {
          process.stdout.write(ansiEscapes.clearScreen);
        }
        else {
          typeMessage(message);
        }

        stdin.resume();
      });
    }

    // start chat with specified user
    async function startChat(user) {
      // replace selector with selected user
      let user_chat_selector = selector.user_chat;
      user_chat_selector = user_chat_selector.replace('XXX', user);

      await page.waitFor(user_chat_selector);
      await page.click(user_chat_selector);
      await page.click(selector.chat_input);
      let name = getCurrentUserName();

      if (name) {
        console.log(logSymbols.success, chalk.bgGreen('You can chat now :-)'));
        console.log(logSymbols.info, chalk.bgRed('Press Ctrl+C twice to exit any time.\n'));
      }
      else {
        console.log(logSymbols.warning, 'Could not find specified user "' + user + '"in chat threads\n');
      }
    }

    // type user-supplied message into chat window for selected user
    async function typeMessage(message) {
      await page.keyboard.type(message);
      await page.keyboard.press('Enter');

      // verify message is sent
      let messageSent = await page.evaluate((selector) => {

        let nodes = document.querySelectorAll(selector);
        let el = nodes[nodes.length - 1];

        return el ? el.innerText : '';
      }, selector.last_message_sent);

      if (message == messageSent) {
        print("You: " + message, config.sent_message_color);

        // setup interval for read receipts
        if (config.read_receipts) {
          last_sent_message_interval = setInterval(function () {
            isLastMessageRead(user, message);
          }, (config.check_message_interval));
        }

      }

      // see if they sent a new message
      readLastOtherPersonMessage();
    }

    // read user's name from conversation thread
    async function getCurrentUserName() {
      return await page.evaluate((selector) => {
        let el = document.querySelector(selector);

        return el ? el.innerText : '';
      }, selector.user_name);
    }

    // read any new messages sent by specified user
    async function readLastOtherPersonMessage() {

      let message = '';
      let name = await getCurrentUserName();

      if (!name) {
        return false;
      }

      // read last message sent by other user
      message = await page.evaluate((selector) => {

        let nodes = document.querySelectorAll(selector);
        let el = nodes[nodes.length - 1];

        if (!el) {
          return '';
        }

        // check if it is picture message

        /*
        if (el.classList.contains('message-image')) {
          return 'Picture Message';
        }
        */

       let picNodes = el.querySelectorAll("img[src*='blob']");
       let isPicture = picNodes[picNodes.length - 1];

       if (isPicture) {
         return 'Picture Message';
       }

        // check if it is gif message
       let gifNodes = el.querySelectorAll("div[style*='background-image']");
       let isGif = gifNodes[gifNodes.length - 1];

       if (isGif) {
         return 'Gif Message';
       }

        // check if it is video message
        let vidNodes = el.querySelectorAll(".video-thumb");
        let isVideo = vidNodes[vidNodes.length - 1];

        if (isVideo) {
          return 'Video Message';
        }

        // check if it is voice message
        let audioNodes = el.querySelectorAll("audio");
        let isAudio = audioNodes[audioNodes.length - 1];

        if (isAudio) {
          return 'Voice Message';
        }

        // check if it is emoji message
        let emojiNodes = el.querySelectorAll("div.selectable-text img.selectable-text");
        let isEmoji = emojiNodes[emojiNodes.length - 1];

        if (isEmoji) {
          return 'Emoji Message';
        }

        // text message
        nodes = el.querySelectorAll('span.selectable-text');
        el = nodes[nodes.length - 1];

        return el ? el.innerText : '';

      }, selector.last_message);


      if (message) {
        if (last_received_message) {
          if (last_received_message != message) {
            last_received_message = message;
            print(name + ": " + message, config.received_message_color);

            // show notification
            notify(name, message);
          }
        }
        else {
          last_received_message = message;
          //print(name + ": " + message, config.received_message_color);
        }

      }
    }

    // checks if last message sent is read
    async function isLastMessageRead(name, message) {

      let is_last_message_read = await page.evaluate((selector) => {

        let nodes = document.querySelectorAll(selector);
        let el = nodes[nodes.length - 1];

        if (el) {
          let readHTML = el.outerHTML;

          if (readHTML.length) {
            return readHTML.indexOf('data-icon="msg-dblcheck-ack"') > -1;
          }
        }

        return false;
      }, selector.last_message_read);

      if (is_last_message_read) {
        if (config.read_receipts && last_sent_message_interval) {
          // make sure we don't report for same message again
          if (!sentMessages.includes(message)) {
            console.log('\n' + logSymbols.success, chalk.gray(message) + '\n');

            sentMessages.push(message);

            clearInterval(last_sent_message_interval);
          }
        }
      }

    }

    // checks for any new messages sent by all other users
    async function checkNewMessagesAllUsers() {
      let name = await getCurrentUserName();

      let user = await page.evaluate((selector) => {

        let nodes = document.querySelectorAll(selector);
        let el = nodes[0];

        return el ? el.innerText : '';
      }, selector.new_message_user);

      if (user && user != name) {
        let message = 'You have a new message by "' + user + '". Switch to that user to see the message.';

        if (last_received_message_other_user != message) {
          print('\n' + message, config.received_message_color_new_user);

          // show notification
          notify(user, message);

          last_received_message_other_user = message;
        }
      }
    }

    // prints on console
    function print(message, color = null) {

      if (!config.colors || color == null) {
        console.log('\n' + message + '\n');
        return;
      }

      if (chalk[color]) {
        console.log('\n' + chalk[color](message) + '\n');
      }
      else {
        console.log('\n' + message + '\n');
      }

    }

    // send notification
    function notify(name, message) {
      if (config.notification_enabled) {

        if (config.notification_hide_message) {
          message = config.notification_hidden_message || 'New Message Received';
        }

        if (config.notification_hide_user) {
          name = config.notification_hidden_user || 'Someone';
        }

        notifier.notify({
          appName: "Snore.DesktopToasts", // Windows FIX - might not be needed
          title: name,
          message: message,
          wait: false,
          timeout: config.notification_time
        });

        // sound/beep
        if (config.notification_sound) {
          process.stdout.write(ansiEscapes.beep);
        }

      }
    }

    setInterval(readLastOtherPersonMessage, (config.check_message_interval));
    setInterval(checkNewMessagesAllUsers, (config.check_message_interval));

  } catch (err) {
    logger.warn(err);
  }

  async function debug(page, logContent = true) {
    if (logContent) {
      console.log(await page.content());
    }

    await page.screenshot({ path: 'screen.png' });
  }

  // setup logging
  function setUpLogging() {

    const env = process.env.NODE_ENV || 'development';
    const logDir = 'logs';

    // Create the log directory if it does not exist
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir);
    }

    const tsFormat = () => (new Date()).toLocaleTimeString();

    const logger = new (winston.Logger)({
      transports: [
        // colorize the output to the console
        new (winston.transports.Console)({
          timestamp: tsFormat,
          colorize: true,
          level: 'info'
        }),
        new (winston.transports.File)({
          filename: `${logDir}/log.log`,
          timestamp: tsFormat,
          level: env === 'development' ? 'debug' : 'info'
        })
      ]
    });

    return logger;
  }

})();

