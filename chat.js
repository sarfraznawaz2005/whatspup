#!/usr/bin/env node

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
// const findChrome = require('./find_chrome');

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
let selectorNewMessage=null;

// because a username can contain first and last name/spaces, etc
for (let i = 2; i <= 5; i++) {
  if (typeof process.argv[i] !== 'undefined') {
    user += process.argv[i] + ' ';
  }
}

user = user.trim();
/////////////////////////////////////////////

// catch un-handled promise errors
process.on("unhandledRejection", (reason, p) => {
  //console.warn("Unhandled Rejection at: Promise", p, "reason:", reason);
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
    let sentMessages = [];
    //////////////////////////////////////////////    

    // const executablePath = findChrome().pop() || null;
    const tmpPath = path.resolve(__dirname, config.data_dir);
    const networkIdleTimeout = 30000;
    const stdin = process.stdin;
    const headless = !config.window;

    const browser = await puppeteer.launch({
      headless: headless,
      // executablePath: executablePath,
      userDataDir: tmpPath,
      // handle SIGINT below
      handleSIGINT: false,
      ignoreHTTPSErrors: true,
      args: [
        '--log-level=3', // fatal only
        //'--start-maximized',
        '--no-default-browser-check',
        '--disable-infobars',
        '--disable-web-security',
        '--disable-site-isolation-trials',
        '--no-experiments',
        '--ignore-gpu-blacklist',
        '--ignore-certificate-errors',
        '--ignore-certificate-errors-spki-list',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-default-apps',
        '--enable-features=NetworkService',
        '--disable-setuid-sandbox',
        '--no-sandbox'
      ],
      ignoreDefaultArgs: ['--enable-automation'],
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3641.0 Safari/537.36');

    //await page.setViewport({width: 1366, height:768});
    await page.setRequestInterception(true);

    page.on('request', (request) => {
      request.continue();
    });

    // close browser on exit
    process.on('SIGINT', () => 
      browser
        .close()
        .then(() => process.exit(0))
        .catch(() => process.exit(0))
    )

    print(gradient.rainbow('Initializing...\n'));

    page.goto('https://web.whatsapp.com/', {
      waitUntil: 'networkidle2',
      timeout: 0
    }).then(async function (response) {

      await page.waitFor(networkIdleTimeout);

      //debug(page);      

      const title = await page.evaluate(() => {

        let nodes = document.querySelectorAll('.window-title');
        let el = nodes[nodes.length - 1];

        return el ? el.innerHTML : '';
      });

      // this means browser upgrade warning came up for some reasons
      if (title && title.includes('Google Chrome 36+')) {
        console.log(logSymbols.error, chalk.red('Could not open whatsapp web, most likely got browser upgrade message....'));
        process.exit();
      }

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
          } else {
            console.log(logSymbols.error, chalk.red('user name not specified!'));
          }
        }
        // clear chat screen
        else if (message.toLowerCase().indexOf('--clear') > -1) {
          process.stdout.write(ansiEscapes.clearScreen);
        } else {
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
      } else {
        console.log(logSymbols.warning, 'Could not find specified user "' + user + '"in chat threads\n');
      }
    }

    // type user-supplied message into chat window for selected user
    async function typeMessage(message) {
      let parts = message.split('\n');

      for (var i = 0; i < parts.length; i++) {
        await page.keyboard.down('Shift');
        await page.keyboard.press('Enter');
        await page.keyboard.up('Shift');

        await page.keyboard.type(parts[i]);
      }

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
        } else {
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

    async function getPhoneNumber(){
    	new_message_user_pic_url
    }
    
    // checks for any new messages sent by all other users
    async function checkNewMessagesAllUsers() {
      let name = await getCurrentUserName();

      let new_message_selector = await getSelectorNewMessage();

      let user = await page.evaluate((selector_newMessage,selector_newMessageUser,selector_newMessageUserPicUrl) => {

    	  let nodes = document.querySelectorAll(selector_newMessage);

    	  let el = nodes[0].parentNode.parentNode.parentNode.parentNode.parentNode.querySelector(selector_newMessageUser);

    	  let name=el ? el.innerText : '';
    	  
    	  el=nodes[0].parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.querySelector(selector_newMessageUserPicUrl);
    	  let number='';
    	  if (el && el.hasAttribute('src')){
    	   let arr=/&u=([0-9]+)/g.exec(el.getAttribute('src'));
    	   if (arr[1])
    		   number=arr[1]
    	  }
    	  return [name,number];

      }, new_message_selector, selector.new_message_user,selector.new_message_user_pic_url);
  
      if (user[0] && user[0] != name) {


        if (last_received_message_other_user != user[0]) {
 
        	let message = 'You have a new message by "' + user[0]+";"+user[1] + '". Switch to that user to see the message.';
          
        	print('\n' + message, config.received_message_color_new_user);

        	// show notification
        	notify(user[0]+";"+user[1], message);

        	last_received_message_other_user = user[0];
        }
      }
    }

  /**
    Get the css selector for new messages all users
  */
    async function getSelectorNewMessage(){
    	if (selectorNewMessage==null){
    		let classname = await page.evaluate((selector) => {
    			let nodes = document.querySelectorAll(selector);
        
    			for (let i = 0; i <= nodes.length; i++) {
    				var style = window.getComputedStyle(nodes[i]);
    				var borderRadius = style.getPropertyValue('border-radius');
    				if (borderRadius=='12px')
    					return nodes[i].className;
    			}

    			return null;
    		}, selector.new_message_count);
    		if (classname==null)
    			console.log(logSymbols.warning, chalk.bgRed('Not yet found a kind of notification of new messages'));
    		else{
    			selectorNewMessage=selector.new_message.replace('XXXXX', classname);
    			console.log(logSymbols.info, chalk.bgRed('It was generated selector of notification of new messages: '+selectorNewMessage));
    		}
    		
    	}

        return selectorNewMessage;
    }
    
    // prints on console
    function print(message, color = null) {

      if (!config.colors || color == null) {
        console.log('\n' + message + '\n');
        return;
      }

      if (chalk[color]) {
        console.log('\n' + chalk[color](message) + '\n');
      } else {
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

    await page.screenshot({
      path: 'screen.png'
    });
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

    const logger = new(winston.Logger)({
      transports: [
        // colorize the output to the console
        new(winston.transports.Console)({
          timestamp: tsFormat,
          colorize: true,
          level: 'info'
        }),
        new(winston.transports.File)({
          filename: `${logDir}/log.log`,
          timestamp: tsFormat,
          level: env === 'development' ? 'debug' : 'info'
        })
      ]
    });

    return logger;
  }

})();