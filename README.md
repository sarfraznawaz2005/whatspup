# Whatspup
Use Whatsapp from commandline/console/cli using [GoogleChrome puppeteer!](https://github.com/GoogleChrome/puppeteer) :smile:

## Features ##

- :white_check_mark: Send and receive messages
- :white_check_mark: Read Receipts
- :white_check_mark: Switch between users to chat with
- :white_check_mark: Popup notifications for new chat messages
- :white_check_mark: Privacy settings for popup notifications
- :white_check_mark: One-time authentication, no need to scan QR code again and again
- :white_check_mark: Windowless/headless (hidden) mode
- :white_check_mark: Colorful chat messages

Of course, it is not possible to send/receive picture messsages from command line.

## Screenshot ##

![Main Window](https://raw.githubusercontent.com/sarfraznawaz2005/whatspup/master/screenshot.jpg)

## Requirements ##

- Node v8+
- puppeteer v0.13.0+

## Installation ##

- Clone this repository. `git clone https://github.com/sarfraznawaz2005/whatspup.git`
- Type `npm install`
- Type `node chat.js USERNAME`
- Wait for connection and start typing your messages :smile:

You can switch chat with another user anytime by typing on console:
`--chat USERNAME`

## Options ##

You can set various options in `config.js` file.

## Issues ##

- Currently does not seem to work in invisible/headless mode (seems to be a bug in puppeteer currently). So you have to set `window` option to `true` in config.js file.

## Contribute ##

You are welcome to contribute to this project.

## Disclaimer ##

This project is not affiliated with offical whatsapp in any sense.
