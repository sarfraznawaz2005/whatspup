#!/usr/bin/env node

const puppeteer = require('puppeteer');
const notifier = require('node-notifier');
const winston = require('winston');
const fs = require('fs');

const config = require('./config.js');
const selector = require('./selector.js');

const user = process.argv[2];

// make sure they specified user to chat with
if (!user) {
  console.log('User argument not specified, exiting...');
  process.exit(1);
}

process.setMaxListeners(0);

(async function main() {

  const logger = setUpLogging();

  try {

    const timeout = 3000000;
    const networkIdleTimeout = 10000;
    const stdin = process.stdin;
    const stdout = process.stdout;
    const headless = !config.window;

    const browser = await puppeteer.launch({
      headless: headless,
      userDataDir: config.data_dir,
      timeout: timeout,
      networkIdleTimeout: networkIdleTimeout,
      args: ['--disable-infobars']
    });


    let last_received_message = '';
    let last_sent_message = '';


    const page = await browser.newPage();

    // specify user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.94 Safari/537.36');

    print('Loading...', 'info');
    await page.goto('https://web.whatsapp.com/', { waitUntil: 'networkidle2' });

    await page.waitFor(30000); // doesn't always work
    //await page.waitFor(selector.user_chat);

    startChat(user);

    notifier.notify('You can chat now :-)');

    print('You can chat now :-)', 'header');
    print('Press Ctrl+C twice to exit any time.', 'error');

    stdin.resume();
    stdin.on('data', function (data) {
      let message = data.toString().trim();

      if (message.indexOf('--chat') > -1) {
        let new_user = message.split(" ")[1];

        if (new_user) {
          startChat(new_user);
        }
      }
      else {
        typeMessage(message);
      }

      stdin.resume();
    });

    async function startChat(user) {
      // replace selector with selected user
      let user_chat_selector = selector.user_chat;
      user_chat_selector = user_chat_selector.replace('XXX', user);

      await page.click(user_chat_selector);
      await page.click(selector.chat_input);
    }

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
        print("You: " + message, 'warning');
      }

      // see if they sent a new message
      readLastOtherPersonMessage(message);
    }

    async function readLastOtherPersonMessage(sentMessage) {

      let name = await page.evaluate((selector) => {
        let el = document.querySelector(selector);

        return el ? el.innerText : '';
      }, selector.user_name);

      if (!name) {
        name = user;
      }

      // read last message sent by other user
      let message = await page.evaluate((selector) => {

        let nodes = document.querySelectorAll(selector);
        let el = nodes[nodes.length - 1];

        return el ? el.innerText : '';
      }, selector.last_message);

      if (message) {
        if (last_received_message) {
          if (last_received_message != message) {
            last_received_message = message;
            print(name + ": " + message, 'success');

            // show notification

            if (config.notification_enabled) {
              let notifContent = config.notification_hide_message ? 'New Message Received' : message;

              notifier.notify({
                title: name,
                message: notifContent,
                wait: true,
                sound: config.notification_sound,
                timeout: config.notification_time
              });

            }
          }
        }
        else {
          last_received_message = message;
          //print(name + ": " + message, 'success');
        }

      }

      isLastMessageRead(name, sentMessage);
    }

    async function isLastMessageRead(name, message) {

      if (message == last_sent_message || !message) {
        return;
      }

      let is_last_message_read = await page.evaluate((selector) => {

        let nodes = document.querySelectorAll(selector);
        let el = nodes[nodes.length - 1];

        if (el) {
          let readHTML = el.innerHTML;

          if (readHTML.length) {
            return readHTML.indexOf('data-icon="msg-dblcheck-ack"') > -1;
          }
        }

        return false;
      }, selector.last_message_read);

      if (is_last_message_read) {
        print('Your last message was read by ' + name, 'info');
      }

      last_sent_message = message;

    }

    setInterval(readLastOtherPersonMessage, (config.check_message_interval * 1000))

    function print(message, type = null) {

      if (!config.colors) {
        console.log('\n' + message);
        return;
      }

      let end_color = '\033[0m';

      let types = {
        header: '\033[95m',
        info: '\033[94m',
        success: '\033[92m',
        warning: '\033[93m',
        error: '\033[91m',
        bold: '\033[1m'
      };

      if (type == null) {
        console.log('\n' + message);
      }
      else {
        console.log('\n' + types[type] + message + end_color);
      }

    }

    //await browser.close();

  } catch (err) {
    //console.error(err);
    logger.warn(err);
  }

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

